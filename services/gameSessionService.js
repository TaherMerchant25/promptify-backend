import { supabase, isSupabaseConfigured } from '../config/supabase.js';

/**
 * Service for managing game sessions in Supabase
 * Stores all game data: prompts, outputs, scores, and timing
 */
class GameSessionService {

  /**
   * Create a new game session
   */
  async createSession(playerName, avatarUrl = null) {
    if (!isSupabaseConfigured()) {
      console.log('⚠️ Supabase not configured, returning local session');
      return { id: `local-${Date.now()}`, player_name: playerName };
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          player_name: playerName,
          avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${playerName}`,
          total_score: 0,
          rounds_completed: 0,
          current_round: 1,
          status: 'Playing',
          round1_data: [],
          round2_data: [],
          round3_data: [],
        })
        .select()
        .single();

      if (error) throw error;
      console.log(`✅ Created game session for ${playerName}: ${data.id}`);
      return data;
    } catch (error) {
      console.error('❌ Error creating session:', error.message);
      return { id: `local-${Date.now()}`, player_name: playerName };
    }
  }

  /**
   * Update session with any fields
   */
  async updateSession(sessionId, updates) {
    if (!isSupabaseConfigured() || sessionId.startsWith('local-')) {
      console.log('⚠️ Supabase not configured, skipping update');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      console.log(`✅ Updated session ${sessionId}`);
      return data;
    } catch (error) {
      console.error('❌ Error updating session:', error.message);
      return null;
    }
  }

  /**
   * Save Round 1 data (sub-rounds with prompts and outputs)
   * @param {string} sessionId 
   * @param {Array} subRoundsData - Array of { subRoundId, targetPhrase, prompt, output, score, timeTaken }
   * @param {number} totalScore 
   * @param {number} totalTime - Time in milliseconds
   */
  async saveRound1Data(sessionId, subRoundsData, totalScore, totalTime) {
    if (!isSupabaseConfigured() || sessionId.startsWith('local-')) {
      console.log('⚠️ Supabase not configured, skipping round 1 save');
      return false;
    }

    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({
          round1_data: subRoundsData,
          round1_score: totalScore,
          round1_time: totalTime,
          total_score: totalScore,
          rounds_completed: 1,
          current_round: 2,
          status: 'Round 2',
        })
        .eq('id', sessionId);

      if (error) throw error;
      console.log(`✅ Saved round 1 data for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('❌ Error saving round 1:', error.message);
      return false;
    }
  }

  /**
   * Save Round 2 data
   * @param {string} sessionId 
   * @param {Array} roundData - Array of { prompt, output, score, timeTaken, targetContent }
   * @param {number} roundScore 
   * @param {number} roundTime 
   * @param {number} previousTotalScore 
   */
  async saveRound2Data(sessionId, roundData, roundScore, roundTime, previousTotalScore) {
    if (!isSupabaseConfigured() || sessionId.startsWith('local-')) {
      console.log('⚠️ Supabase not configured, skipping round 2 save');
      return false;
    }

    try {
      const newTotalScore = previousTotalScore + roundScore;
      const { error } = await supabase
        .from('game_sessions')
        .update({
          round2_data: roundData,
          round2_score: roundScore,
          round2_time: roundTime,
          total_score: newTotalScore,
          rounds_completed: 2,
          current_round: 3,
          status: 'Round 3',
        })
        .eq('id', sessionId);

      if (error) throw error;
      console.log(`✅ Saved round 2 data for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('❌ Error saving round 2:', error.message);
      return false;
    }
  }

  /**
   * Save Round 3 data and mark game as complete
   * @param {string} sessionId 
   * @param {Array} roundData 
   * @param {number} roundScore 
   * @param {number} roundTime 
   * @param {number} previousTotalScore 
   * @param {number} totalGameTime 
   */
  async saveRound3Data(sessionId, roundData, roundScore, roundTime, previousTotalScore, totalGameTime) {
    if (!isSupabaseConfigured() || sessionId.startsWith('local-')) {
      console.log('⚠️ Supabase not configured, skipping round 3 save');
      return false;
    }

    try {
      const newTotalScore = previousTotalScore + roundScore;
      const { error } = await supabase
        .from('game_sessions')
        .update({
          round3_data: roundData,
          round3_score: roundScore,
          round3_time: roundTime,
          total_score: newTotalScore,
          total_time: totalGameTime,
          rounds_completed: 3,
          current_round: 3,
          status: 'Finished',
        })
        .eq('id', sessionId);

      if (error) throw error;
      console.log(`✅ Saved round 3 data for session ${sessionId} - Game Complete!`);
      return true;
    } catch (error) {
      console.error('❌ Error saving round 3:', error.message);
      return false;
    }
  }

  /**
   * Get leaderboard (top players by score, then by time)
   */
  async getLeaderboard(limit = 50) {
    if (!isSupabaseConfigured()) {
      console.log('⚠️ Supabase not configured, returning empty leaderboard');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .order('total_score', { ascending: false })
        .order('total_time', { ascending: true, nullsFirst: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error.message);
      return [];
    }
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId) {
    if (!isSupabaseConfigured() || sessionId.startsWith('local-')) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching session:', error.message);
      return null;
    }
  }

  /**
   * Get all sessions for a player (history)
   */
  async getPlayerHistory(playerName) {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('player_name', playerName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching player history:', error.message);
      return [];
    }
  }

  /**
   * Get all sessions (for admin/analytics)
   */
  async getAllSessions(limit = 100) {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching all sessions:', error.message);
      return [];
    }
  }

  /**
   * Get statistics for the game
   */
  async getStats() {
    if (!isSupabaseConfigured()) {
      return { totalPlayers: 0, completedGames: 0, averageScore: 0 };
    }

    try {
      // Get total count
      const { count: totalPlayers } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true });

      // Get completed games count
      const { count: completedGames } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Finished');

      // Get average score of completed games
      const { data: scores } = await supabase
        .from('game_sessions')
        .select('total_score')
        .eq('status', 'Finished');

      const averageScore = scores && scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.total_score, 0) / scores.length)
        : 0;

      return {
        totalPlayers: totalPlayers || 0,
        completedGames: completedGames || 0,
        averageScore,
      };
    } catch (error) {
      console.error('❌ Error fetching stats:', error.message);
      return { totalPlayers: 0, completedGames: 0, averageScore: 0 };
    }
  }
}

export const gameSessionService = new GameSessionService();
export default gameSessionService;
