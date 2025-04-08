// Service to handle logging of chat interactions to the database


import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'financial_chatbot',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Log a chat interaction to the database
 * @param {object} interaction - The chat interaction to log
 * @param {string} interaction.userId - User ID
 * @param {string} interaction.userQuery - User's message
 * @param {string} interaction.detectedIntent - Intent detected by the model
 * @param {string} interaction.botResponse - Bot's response
 * @param {string} [interaction.sessionId] - Optional session ID
 * @returns {Promise<void>}
 */
export async function logChatInteraction(interaction) {
  const { userId, userQuery, detectedIntent, botResponse, sessionId = null } = interaction;
  
  const logEntry = {
    sessionId,
    userId,
    userQuery,
    detectedIntent,
    botResponse,
    timestamp: new Date().toISOString()
  };
  
  // Log to console for debugging
  console.log('Chat Log:', JSON.stringify(logEntry, null, 2));
  
  try {
    await pool.query(
      'INSERT INTO chat_logs (session_id, user_id, user_query, detected_intent, bot_response) VALUES (?, ?, ?, ?, ?)',
      [sessionId, userId, userQuery, detectedIntent, botResponse]
    );
    
    console.log('Chat interaction logged to database successfully');
  } catch (error) {
    console.error('Error logging chat interaction to database:', error);
  }
  
  return;
}

export default {
  logChatInteraction
};
