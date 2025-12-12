import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { gameSessionService } from "./services/gameSessionService.js";
import { isSupabaseConfigured } from "./config/supabase.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Allow all origins for hackathon
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

// -- REST API Routes --

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    supabase: isSupabaseConfigured() ? "connected" : "not configured",
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "Promptify Backend API",
    version: "2.0.0",
    endpoints: {
      health: "GET /health",
      createSession: "POST /api/sessions",
      getSession: "GET /api/sessions/:sessionId",
      updateSession: "PUT /api/sessions/:sessionId",
      saveRound1: "PUT /api/sessions/:sessionId/round1",
      saveRound2: "PUT /api/sessions/:sessionId/round2",
      saveRound3: "PUT /api/sessions/:sessionId/round3",
      leaderboard: "GET /api/leaderboard",
      playerHistory: "GET /api/players/:playerName/sessions"
    }
  });
});

// ===== SESSION ENDPOINTS =====

// Create a new game session
app.post("/api/sessions", async (req, res) => {
  try {
    const { playerName, avatarUrl } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: "Player name is required" });
    }

    const session = await gameSessionService.createSession(playerName, avatarUrl);
    res.json({ success: true, session });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
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

// Update session (generic update)
app.put("/api/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    const result = await gameSessionService.updateSession(sessionId, updates);
    res.json({ success: true, session: result });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
});

// ===== ROUND DATA ENDPOINTS =====

// Save Round 1 data (sub-rounds with prompts and outputs)
app.put("/api/sessions/:sessionId/round1", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { subRoundsData, totalScore, totalTime } = req.body;

    const result = await gameSessionService.saveRound1Data(
      sessionId, 
      subRoundsData, 
      totalScore, 
      totalTime
    );
    
    res.json({ success: result, message: result ? "Round 1 saved" : "Failed to save" });
  } catch (error) {
    console.error("Error saving round 1:", error);
    res.status(500).json({ error: "Failed to save round 1 data" });
  }
});

// Save Round 2 data
app.put("/api/sessions/:sessionId/round2", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { roundData, roundScore, roundTime, previousTotalScore } = req.body;

    const result = await gameSessionService.saveRound2Data(
      sessionId, 
      roundData, 
      roundScore, 
      roundTime, 
      previousTotalScore
    );
    
    res.json({ success: result, message: result ? "Round 2 saved" : "Failed to save" });
  } catch (error) {
    console.error("Error saving round 2:", error);
    res.status(500).json({ error: "Failed to save round 2 data" });
  }
});

// Save Round 3 data and complete game
app.put("/api/sessions/:sessionId/round3", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { roundData, roundScore, roundTime, previousTotalScore, totalGameTime } = req.body;

    const result = await gameSessionService.saveRound3Data(
      sessionId, 
      roundData, 
      roundScore, 
      roundTime, 
      previousTotalScore,
      totalGameTime
    );
    
    res.json({ success: result, message: result ? "Round 3 saved, game complete!" : "Failed to save" });
  } catch (error) {
    console.error("Error saving round 3:", error);
    res.status(500).json({ error: "Failed to save round 3 data" });
  }
});

// ===== LEADERBOARD ENDPOINTS =====

// Get leaderboard from Supabase
app.get("/api/leaderboard", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const leaderboard = await gameSessionService.getLeaderboard(limit);
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ===== PLAYER ENDPOINTS =====

// Get player history
app.get("/api/players/:playerName/sessions", async (req, res) => {
  try {
    const { playerName } = req.params;
    const sessions = await gameSessionService.getPlayerHistory(playerName);
    res.json({ success: true, sessions });
  } catch (error) {
    console.error("Error fetching player sessions:", error);
    res.status(500).json({ error: "Failed to fetch player sessions" });
  }
});

// ===== ADMIN/ANALYTICS ENDPOINTS =====

// Get all sessions (for admin/analytics)
app.get("/api/admin/sessions", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const sessions = await gameSessionService.getAllSessions(limit);
    res.json({ success: true, sessions, count: sessions.length });
  } catch (error) {
    console.error("Error fetching all sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Get statistics
app.get("/api/admin/stats", async (req, res) => {
  try {
    const stats = await gameSessionService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           🎮 Promptify Backend API Server                ║
╠══════════════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}                        ║
║  Supabase:  ${isSupabaseConfigured() ? '✅ Connected' : '⚠️  Not configured (check .env)'}               ║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║    POST   /api/sessions          - Create session        ║
║    GET    /api/sessions/:id      - Get session           ║
║    PUT    /api/sessions/:id      - Update session        ║
║    PUT    /api/sessions/:id/round1 - Save round 1        ║
║    PUT    /api/sessions/:id/round2 - Save round 2        ║
║    PUT    /api/sessions/:id/round3 - Save round 3        ║
║    GET    /api/leaderboard       - Get leaderboard       ║
║    GET    /api/players/:name/sessions - Player history   ║
╚══════════════════════════════════════════════════════════╝
  `);
});
║  Frontend:  ${FRONTEND_URL}                     ║
╚══════════════════════════════════════════════════════════╝
  `);
});
