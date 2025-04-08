
// MySQL database service for the Financial Chatbot


import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create a connection pool
let pool;


// Initialize the database connection pool

export async function initializeDatabase() {
  try {
    // Create the connection pool
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'financial_chatbot',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test the connection
    const connection = await pool.getConnection();
    console.log(' MySQL database connection successful');
    connection.release();
    
    await createTablesIfNotExist();
    
    return true;
  } catch (error) {
    console.error(' Error initializing MySQL database:', error);
    console.log(' Continuing without database persistence');
    return false;
  }
}

// Create the necessary tables if they don't exist

async function createTablesIfNotExist() {
  if (!pool) return;
  
  const connection = await pool.getConnection();
  
  try {
    // Chat logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36),
        user_id VARCHAR(50) NOT NULL,
        user_query TEXT NOT NULL,
        detected_intent VARCHAR(50),
        bot_response TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        model VARCHAR(50),
        processing_time_ms INT,
        prompt_tokens INT,
        completion_tokens INT,
        total_tokens INT,
        faq_matches INT
      )
    `);
    
    // FAQs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id VARCHAR(36) PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(50),
        embedding JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Users table (simplified for demo)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Transactions table (simplified for demo)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        recipient VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL,
        type VARCHAR(20) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    console.log(' Database tables created or already exist');
  } catch (error) {
    console.error(' Error creating database tables:', error);
  } finally {
    connection.release();
  }
}


// Log a chat interaction to the database

export async function logChatToDatabase(chatLog) {
  if (!pool) return null;
  
  try {
    const id = generateUuid();
    
    const [result] = await pool.query(
      `INSERT INTO chat_logs (
        id, session_id, user_id, user_query, detected_intent, bot_response,
        timestamp, model, processing_time_ms, prompt_tokens, completion_tokens,
        total_tokens, faq_matches
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
      [
        id,
        chatLog.sessionId || null,
        chatLog.userId,
        chatLog.userQuery,
        chatLog.detectedIntent,
        chatLog.botResponse,
        chatLog.model || 'unknown',
        chatLog.processing_time_ms || 0,
        chatLog.prompt_tokens || 0,
        chatLog.completion_tokens || 0,
        chatLog.total_tokens || 0,
        chatLog.faq_matches || 0
      ]
    );
    
    return id;
  } catch (error) {
    console.error(' Error logging chat to database:', error);
    return null;
  }
}


// Retrieve FAQs from the database

export async function getFaqsFromDatabase() {
  if (!pool) return [];
  
  try {
    const [rows] = await pool.query('SELECT id, question, answer, category FROM faqs');
    return rows;
  } catch (error) {
    console.error(' Error retrieving FAQs from database:', error);
    return [];
  }
}

/**
 * Store FAQ embeddings in the database
 * @param {string} faqId - FAQ ID
 * @param {Array} embedding - Vector embedding
 * @returns {Promise<boolean>} - Success status
 */
export async function storeFaqEmbedding(faqId, embedding) {
  if (!pool) return false;
  
  try {
    await pool.query(
      'UPDATE faqs SET embedding = ? WHERE id = ?',
      [JSON.stringify(embedding), faqId]
    );
    return true;
  } catch (error) {
    console.error(` Error storing embedding for FAQ ${faqId}:`, error);
    return false;
  }
}


// Get embeddings for all FAQs

export async function getAllFaqEmbeddings() {
  if (!pool) return [];
  
  try {
    const [rows] = await pool.query('SELECT id, embedding FROM faqs WHERE embedding IS NOT NULL');
    
    return rows.map(row => ({
      id: row.id,
      embedding: JSON.parse(row.embedding)
    }));
  } catch (error) {
    console.error(' Error retrieving FAQ embeddings from database:', error);
    return [];
  }
}


// Generate a simple UUID for database IDs

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

initializeDatabase()
  .then(success => {
    if (success) {
      console.log('✅ Database service ready');
    } else {
      console.log('⚠️ Database service running in fallback mode (no persistence)');
    }
  });
