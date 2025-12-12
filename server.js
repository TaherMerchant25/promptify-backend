import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { gameSessionService } from "./services/gameSessionService.js";
import { isSupabaseConfigured } from "./config/supabase.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT"],
  credentials: true
}));
app.use(express.json());

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// -- Game State --
const socketPlayers = new Map();
const persistentPlayers = new Map();
const playerSessions = new Map(); // Map player username to Supabase session ID

function broadcastLeaderboard() {
  const allPlayers = Array.from(persistentPlayers.values())
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({ ...p, rank: index + 1 }));
  
  io.emit("leaderboard_update", allPlayers);
}

// -- REST API Routes --

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    supabase: isSupabaseConfigured() ? "connected" : "not configured",
    timestamp: new Date().toISOString()
  });
});

// Create a new game session
app.post("/api/sessions", async (req, res) => {
  try {
    const { playerName, apiKey } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: "Player name is required" });
    }

    const session = await gameSessionService.createSession(playerName, apiKey);
    res.json({ success: true, session });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Update round data
app.put("/api/sessions/:sessionId/rounds/:roundNumber", async (req, res) => {
  try {
    const { sessionId, roundNumber } = req.params;
    const roundData = req.body;

    const result = await gameSessionService.updateRoundData(
      sessionId, 
      parseInt(roundNumber), 
      roundData
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating round:", error);
    res.status(500).json({ error: "Failed to update round data" });
  }
});

// Complete a session
app.put("/api/sessions/:sessionId/complete", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const finalData = req.body;

    const result = await gameSessionService.completeSession(sessionId, finalData);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error completing session:", error);
    res.status(500).json({ error: "Failed to complete session" });
  }
});

// Get leaderboard from database
app.get("/api/leaderboard", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await gameSessionService.getLeaderboard(limit);
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// Get session by ID
app.get("/api/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await gameSessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    res.json({ success: true, session });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// Get player history
app.get("/api/players/:playerName/sessions", async (req, res) => {
  try {
    const { playerName } = req.params;
    const sessions = await gameSessionService.getPlayerSessions(playerName);
    res.json({ success: true, sessions });
  } catch (error) {
    console.error("Error fetching player sessions:", error);
    res.status(500).json({ error: "Failed to fetch player sessions" });
  }
});

// -- Socket Events --
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  broadcastLeaderboard();

  socket.on("join", async (userData) => {
    const playerKey = userData.username;
    
    let player = persistentPlayers.get(playerKey) || {
      username: userData.username,
      avatarUrl: userData.avatarUrl,
      score: 0,
      status: "Just Joined",
      isBot: false
    };
    
    if (userData.avatarUrl) {
      player.avatarUrl = userData.avatarUrl;
    }
    
    persistentPlayers.set(playerKey, player);
    socketPlayers.set(socket.id, playerKey);

    // Create a Supabase session for this player
    if (!playerSessions.has(playerKey)) {
      const session = await gameSessionService.createSession(
        userData.username, 
        userData.apiKey
      );
      playerSessions.set(playerKey, session.id);
      socket.emit("session_created", { sessionId: session.id });
    } else {
      socket.emit("session_created", { sessionId: playerSessions.get(playerKey) });
    }
    
    console.log(`👤 Player joined: ${userData.username}`);
    broadcastLeaderboard();
  });

  socket.on("update_progress", (data) => {
    const playerKey = socketPlayers.get(socket.id);
    if (playerKey) {
      const player = persistentPlayers.get(playerKey);
      if (player) {
        persistentPlayers.set(playerKey, { ...player, ...data });
        broadcastLeaderboard();
      }
    }
  });

  // Handle round completion - save to Supabase
  socket.on("round_complete", async (data) => {
    const playerKey = socketPlayers.get(socket.id);
    if (playerKey) {
      const sessionId = playerSessions.get(playerKey);
      if (sessionId) {
        await gameSessionService.updateRoundData(sessionId, data.roundNumber, {
          prompts: data.prompts,
          outputs: data.outputs,
          scores: data.scores,
          score: data.score,
          timeTaken: data.timeTaken
        });
        console.log(`💾 Saved round ${data.roundNumber} data for ${playerKey}`);
      }
    }
  });

  // Handle game completion - finalize in Supabase
  socket.on("game_complete", async (data) => {
    const playerKey = socketPlayers.get(socket.id);
    if (playerKey) {
      const sessionId = playerSessions.get(playerKey);
      if (sessionId) {
        await gameSessionService.completeSession(sessionId, {
          totalScore: data.totalScore,
          totalTime: data.totalTime
        });
        console.log(`🏆 Game completed for ${playerKey} with score ${data.totalScore}`);
      }
    }
  });

  socket.on("disconnect", () => {
    const playerKey = socketPlayers.get(socket.id);
    if (playerKey) {
      console.log(`👋 Player disconnected: ${playerKey}`);
      socketPlayers.delete(socket.id);
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           🎮 Promptify Backend Server                    ║
╠══════════════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}                        ║
║  Supabase:  ${isSupabaseConfigured() ? '✅ Connected' : '⚠️  Not configured (check .env)'}               ║
║  Frontend:  ${FRONTEND_URL}                     ║
╚══════════════════════════════════════════════════════════╝
  `);
});
