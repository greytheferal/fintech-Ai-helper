
// Developer Routes - Provide debugging and monitoring information and this uses databaseService for DB stats and monitoringService for system stats.

import express from 'express';
import {
    executeQuery
} from '../database/databaseService.js';
import { getSystemMetrics } from '../services/monitoringService.js';
import pool from '../database/cloudSqlConfig.js';


// Get count of unique users in logs
async function countUniqueUsersInLogs() {
  try {
    const result = await executeQuery(
      'SELECT COUNT(DISTINCT user_id) as count FROM chat_logs'
    );
    return result[0].count || 0;
  } catch (error) {
    console.error('Error counting unique users:', error);
    return 0;
  }
}


// Get total count of chat logs
async function countChatLogs() {
  try {
    const result = await executeQuery(
      'SELECT COUNT(*) as count FROM chat_logs'
    );
    return result[0].count || 0;
  } catch (error) {
    console.error('Error counting chat logs:', error);
    return 0;
  }
}


// Get distribution of intents from chat logs

async function getIntentDistribution() {
  try {
    const results = await executeQuery(
      `SELECT detected_intent, COUNT(*) as count 
       FROM chat_logs 
       WHERE detected_intent IS NOT NULL 
       GROUP BY detected_intent 
       ORDER BY count DESC`
    );
    
    // Convert to object with intent as key
    const distribution = {};
    results.forEach(row => {
      distribution[row.detected_intent] = row.count;
    });
    
    return distribution;
  } catch (error) {
    console.error('Error getting intent distribution:', error);
    return {};
  }
}


// Get recent query patterns

async function getRecentQueryStats(limit = 5) {
  try {
    const results = await executeQuery(
      `SELECT user_query, detected_intent, COUNT(*) as count 
       FROM chat_logs 
       GROUP BY user_query, detected_intent 
       ORDER BY count DESC 
       LIMIT ?`,
      [limit]
    );
    
    return results.map(row => ({
      query: row.user_query.substring(0, 50) + (row.user_query.length > 50 ? '...' : ''),
      intent: row.detected_intent,
      count: row.count
    }));
  } catch (error) {
    console.error('Error getting recent query stats:', error);
    return [];
  }
}


// Get token usage statistics
async function getTokenUsageStats() {
  try {
    const results = await executeQuery(
      `SELECT 
         SUM(prompt_tokens) as total_prompt,
         SUM(completion_tokens) as total_completion,
         SUM(total_tokens) as grand_total,
         AVG(processing_time_ms) as avg_processing
       FROM chat_logs 
       WHERE prompt_tokens IS NOT NULL`
    );
    
    return results[0] || { total_prompt: 0, total_completion: 0, grand_total: 0, avg_processing: 0 };
  } catch (error) {
    console.error('Error getting token usage stats:', error);
    return { total_prompt: 0, total_completion: 0, grand_total: 0, avg_processing: 0 };
  }
}


// Get recent AI interactions
async function getRecentAiInteractions(limit = 5) {
  try {
    const results = await executeQuery(
      `SELECT user_id, user_query, bot_response, detected_intent, timestamp, 
              prompt_tokens, completion_tokens, total_tokens, processing_time_ms
       FROM chat_logs 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [limit]
    );
    
    return results;
  } catch (error) {
    console.error('Error getting recent AI interactions:', error);
    return [];
  }
}

const router = express.Router();


// Get real-time developer debug information
router.get('/metrics', async (req, res, next) => {
  try {
    const systemMetrics = await getSystemMetrics();

    // Database Specific Metrics
    let dbStatus = 'offline';
    let dbPoolStats = { totalConnections: 0, activeConnections: 0, idleConnections: 0, queueSize: 0 };
    let dbPingLatency = null;
    let dbError = null;
    let userCount = 0;
    let chatLogsCount = 0;
    let recentQueries = [];
    let intentDistribution = {};
    let tokenStats = {};

    try {
        // 1. Basic Ping Test & Latency
        const dbStart = Date.now();
        const connection = await pool.getConnection();
        dbPingLatency = Date.now() - dbStart;
        dbStatus = 'online';

        // 2. Pool Statistics
        // It is a basic placeholder. TODO for more detailed stats in the future. 
        // For now, I just know I (let's say) *can* get a connection.
        dbPoolStats.totalConnections = pool.config.connectionLimit;
        // TODO:  Getting active/idle/queue requires more complex tracking or different library features. Maybe in the future. 

        // 3. Fetch specific stats using databaseService
        userCount = await countUniqueUsersInLogs();
        chatLogsCount = await countChatLogs();
        intentDistribution = await getIntentDistribution();
        recentQueries = await getRecentQueryStats(5);
        tokenStats = await getTokenUsageStats();

        connection.release();

    } catch (error) {
        console.error(' Error retrieving database metrics:', error.message);
        dbStatus = 'error';
        dbError = { message: error.message, code: error.code || 'UNKNOWN_DB_ERROR' };
    }

     // AI Model Specific Metrics
     let recentAiInteractions = [];
     let aiModelError = null;
     try {
         recentAiInteractions = await getRecentAiInteractions(5);
         // Format response preview
         recentAiInteractions = recentAiInteractions.map(row => ({
            ...row,
            botResponsePreview: row.bot_response?.substring(0, 70) + (row.bot_response?.length > 70 ? '...' : ''),
            timestamp: new Date(row.timestamp).toLocaleString()
         }));
     } catch (error) {
         console.error(' Error retrieving AI interaction metrics:', error.message);
         aiModelError = { message: error.message, code: error.code || 'UNKNOWN_AI_METRIC_ERROR' };
     }

     // Calculate estimated cost based on fetched token stats (pretty useful for debugging and to not use all of your credits in one night hipotetically like some of us , like 295.000 tokens )
     let estimatedCost = 0;
     if (tokenStats.total_prompt && tokenStats.total_completion) {
         estimatedCost = (
             (parseInt(tokenStats.total_prompt) / 1000 * 0.03) + 
             (parseInt(tokenStats.total_completion) / 1000 * 0.06)
         ).toFixed(4);
     }

    // Construct final response
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        system: systemMetrics,
        database: {
          status: dbStatus,
          error: dbError,
          pingLatencyMs: dbPingLatency,
          poolStats: dbPoolStats,
          activeUserEstimate: userCount,
          totalChatLogs: chatLogsCount,
          recentQueryPatterns: recentQueries,
          databaseType: 'Google Cloud MySQL',
        },
        aiModel: {
          primaryModel: 'Custom Financial Assistant (OpenAI GPT-4)',
          embeddingModel: 'text-embedding-ada-002',
          error: aiModelError,
          recentInteractions: recentAiInteractions,
          tokenUsage: {
              totalPromptTokens: parseInt(tokenStats.total_prompt || 0),
              totalCompletionTokens: parseInt(tokenStats.total_completion || 0),
              grandTotalTokens: parseInt(tokenStats.grand_total || 0),
              averageProcessingTimeMs: parseFloat(tokenStats.avg_processing || 0).toFixed(0),
              estimatedCostUSD: estimatedCost
          },
          intentDistribution: intentDistribution
        }
      }
    });
  } catch (error) {
    console.error(`[${req.requestId}] Error in GET /api/developer/metrics:`, error);
    next(error);
  }
});

export default router;