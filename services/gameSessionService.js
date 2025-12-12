import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import crypto from 'crypto';

/**
 * Service for managing game sessions in Supabase
 */
class GameSessionService {
  
  /**
   * Hash an API key for storage (we don't store raw API keys)
   */
  hashApiKey(apiKey) {
    if (!apiKey) return null;
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 64);
  }

  /**
   * Create a new game session
   */
  async createSession(playerName, apiKey = null) {
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, skipping session creation');
      return { id: `local-${Date.now()}`, playerName };
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          player_name: playerName,
          api_key_hash: this.hashApiKey(apiKey)
        })
        .select()
        .single();

      if (error) throw error;
      console.log(`✅ Created game session for ${playerName}: ${data.id}`);
      return data;
    } catch (error) {
      console.error('❌ Error creating session:', error.message);
      return { id: `local-${Date.now()}`, playerName };
    }
  }

  /**
   * Update round data for a session
   */
  async updateRoundData(sessionId, roundNumber, roundData) {
    if (!isSupabaseConfigured() || sessionId.startsWith('local-')) {
      console.log('Supabase not configured, skipping round update');
      return null;
    }

    try {
      const updateData = {};
      
      // Set the appropriate fields based on round number
      if (roundNumber === 1) {
        updateData.round1_prompts = roundData.prompts || [];
        updateData.round1_outputs = roundData.outputs || [];
        updateData.round1_scores = roundData.scores || [];
        updateData.round1_time = roundData.timeTaken || 0;
      } else if (roundNumber === 2) {
        updateData.round2_prompts = roundData.prompts || [];
        updateData.round2_outputs = roundData.outputs || [];
        updateData.round2_score = roundData.score || 0;
        updateData.round2_time = roundData.timeTaken || 0;
      } else if (roundNumber === 3) {
        updateData.round3_prompts = roundData.prompts || [];
        updateData.round3_outputs = roundData.outputs || [];
        updateData.round3_score = roundData.score || 0;
        updateData.round3_time = roundData.timeTaken || 0;
      }

      const { data, error } = await supabase
        .from('game_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      console.log(`✅ Updated round ${roundNumber} data for session ${sessionId}`);
      return data;
    } catch (error) {
      console.error(`❌ Error updating round ${roundNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Complete a game session with final scores
   */
  async completeSession(sessionId, finalData) {
    if (!isSupabaseConfigured() || sessionId.startsWith('local-')) {
      console.log('Supabase not configured, skipping session completion');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .update({
          total_score: finalData.totalScore || 0,
          total_time: finalData.totalTime || 0,
          completed: true
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      console.log(`✅ Completed session ${sessionId} with score ${finalData.totalScore}`);
      return data;
    } catch (error) {
      console.error('❌ Error completing session:', error.message);
      return null;
    }
  }

  /**
   * Get leaderboard (top players)
   */
  async getLeaderboard(limit = 10) {
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, returning empty leaderboard');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('player_name, total_score, total_time, created_at')
        .eq('completed', true)
        .order('total_score', { ascending: false })
        .order('total_time', { ascending: true })
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
   * Get all sessions for a player
   */
  async getPlayerSessions(playerName) {
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
      console.error('❌ Error fetching player sessions:', error.message);
      return [];
    }
  }
}

export const gameSessionService = new GameSessionService();
export default gameSessionService;
