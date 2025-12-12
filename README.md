# Promptify Backend

Backend server for the Promptify AI prompt engineering game.

## Features

- **Socket.io** for real-time leaderboard updates
- **Supabase** integration for persistent storage of game sessions
- **REST API** for game data management

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

3. **Set up Supabase table:**
   
   Run the SQL in `supabase_schema.sql` in your Supabase SQL Editor to create the `game_sessions` table.

4. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

## API Endpoints

### Health Check
```
GET /health
```

### Sessions
```
POST /api/sessions
Body: { "playerName": "string", "apiKey": "string" (optional) }

GET /api/sessions/:sessionId

PUT /api/sessions/:sessionId/rounds/:roundNumber
Body: { "prompts": [], "outputs": [], "scores": [], "timeTaken": number }

PUT /api/sessions/:sessionId/complete
Body: { "totalScore": number, "totalTime": number }
```

### Leaderboard
```
GET /api/leaderboard?limit=10
```

### Player History
```
GET /api/players/:playerName/sessions
```

## Socket Events

### Client → Server
- `join` - Join the game with user data
- `update_progress` - Update player status/score
- `round_complete` - Save round data to database
- `game_complete` - Finalize game session

### Server → Client
- `leaderboard_update` - Broadcast updated leaderboard
- `session_created` - Confirm session creation with ID

## Database Schema

The `game_sessions` table stores:
- Player name and hashed API key
- Time taken for each round
- Prompts submitted per round
- AI outputs received per round
- Scores per round and total
- Completion status and timestamps

## Project Structure

```
promptify-backend/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env.example           # Environment template
├── .gitignore
├── supabase_schema.sql    # Database schema
├── config/
│   └── supabase.js        # Supabase client
└── services/
    └── gameSessionService.js  # Database operations
```
