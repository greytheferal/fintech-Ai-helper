
// This script (long story short) is used to centralized database service for database interactions

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
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
 * Custom error class for database service errors
 */
export class DatabaseServiceError extends Error {
  constructor(message, code = 'DB_ERROR') {
    super(message);
    this.name = 'DatabaseServiceError';
    this.code = code;
  }
}

/**
 * Execute a database query with error handling
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
export async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.query(query, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw new DatabaseServiceError(`Database error: ${error.message}`, 'QUERY_FAILED');
  }
}

 // Get schema information for all tables

export async function getSchemaInfo() {
  try {
    // Get list of tables
    const tables = await executeQuery(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ?`,
      [process.env.DB_NAME || 'financial_chatbot']
    );
    
    const schemaInfo = {};
    
    // Get column information for each table
    for (const table of tables) {
      const tableName = table.TABLE_NAME || table.table_name;
      
      const columns = await executeQuery(
        `SELECT column_name, column_type 
         FROM information_schema.columns 
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ordinal_position`,
        [process.env.DB_NAME || 'financial_chatbot', tableName]
      );
      
      schemaInfo[tableName] = columns.map(col => {
        const colName = col.COLUMN_NAME || col.column_name;
        const colType = col.COLUMN_TYPE || col.column_type;
        return `${colName} (${colType})`;
      });
    }
    
    return schemaInfo;
  } catch (error) {
    console.error('Error getting schema info:', error);
    return {};
  }
}

// Get all stored FAQ embeddings from the database

export async function getAllStoredFaqEmbeddings() {
  try {
    try {
      const tableCheck = await executeQuery(
        `SELECT COUNT(*) as table_exists 
         FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = 'faq_embeddings'`,
        [process.env.DB_NAME || 'financial_chatbot']
      );
      
      if (tableCheck[0].table_exists === 0) {
        console.warn('faq_embeddings table does not exist yet in the database');
        return [];
      }
    } catch (tableCheckError) {
      console.error('Error checking faq_embeddings table existence:', tableCheckError);
    }
    
    const results = await executeQuery(
      `SELECT faq_id as id, embedding 
       FROM faq_embeddings 
       WHERE embedding IS NOT NULL`
    );
    
    if (!results || results.length === 0) {
      console.log('No FAQ embeddings found in the database');
      return [];
    }
    
    return results.map(row => {
      try {
        return {
          id: row.id,
          embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding
        };
      } catch (parseError) {
        console.error(`Error parsing embedding for FAQ ID ${row.id}:`, parseError);
        return null;
      }
    }).filter(item => item !== null);
    
  } catch (error) {
    console.error('Error fetching FAQ embeddings:', error);
    throw new DatabaseServiceError(`Failed to fetch FAQ embeddings: ${error.message}`, 'FAQ_FETCH_FAILED');
  }
}


 // Get all basic FAQ information without embeddings

export async function getAllFaqsBasic() {
  try {
    try {
      const tableCheck = await executeQuery(
        `SELECT COUNT(*) as table_exists 
         FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = 'faq_embeddings'`,
        [process.env.DB_NAME || 'financial_chatbot']
      );
      
      if (tableCheck[0].table_exists === 0) {
        console.warn('faq_embeddings table does not exist yet in the database');
        return [];
      }
    } catch (tableCheckError) {
      console.error('Error checking faq_embeddings table existence:', tableCheckError);
    }
    
    const results = await executeQuery(
      `SELECT 
         faq_id as id, 
         question, 
         answer,
         category
       FROM faq_embeddings
       WHERE question IS NOT NULL AND answer IS NOT NULL
       ORDER BY faq_id`
    );
    
    if (!results || results.length === 0) {
      console.log('No FAQs found in the database');
      return [];
    }
    
    return results;
  } catch (error) {
    console.error('Error fetching basic FAQs:', error);
    throw new DatabaseServiceError(`Failed to fetch basic FAQs: ${error.message}`, 'FAQ_FETCH_FAILED');
  }
}

// Get a specific FAQ by ID

export async function getFaqById(faqId) {
  try {
    try {
      const tableCheck = await executeQuery(
        `SELECT COUNT(*) as table_exists 
         FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = 'faq_embeddings'`,
        [process.env.DB_NAME || 'financial_chatbot']
      );
      
      if (tableCheck[0].table_exists === 0) {
        console.warn('faq_embeddings table does not exist yet in the database');
        return null;
      }
    } catch (tableCheckError) {
      console.error('Error checking faq_embeddings table existence:', tableCheckError);
    }
    
    if (!faqId) {
      return null;
    }
    
    const results = await executeQuery(
      `SELECT
         faq_id,
         question,
         answer,
         category,
         created_at,
         updated_at
       FROM faq_embeddings
       WHERE faq_id = ?`,
      [faqId]
    );
    
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error(`Error fetching FAQ by ID ${faqId}:`, error);
    return null;
  }
}


// Check if an embedding exists for a specific FAQ

export async function checkFaqEmbeddingExists(faqId) {
  try {
    try {
      const tableCheck = await executeQuery(
        `SELECT COUNT(*) as table_exists 
         FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = 'faq_embeddings'`,
        [process.env.DB_NAME || 'financial_chatbot']
      );
      
      if (tableCheck[0].table_exists === 0) {
        console.warn('faq_embeddings table does not exist yet in the database');
        return false;
      }
    } catch (tableCheckError) {
      console.error('Error checking faq_embeddings table existence:', tableCheckError);
    }
    
    if (!faqId) {
      return false;
    }
    
    const results = await executeQuery(
      `SELECT COUNT(*) as count
       FROM faq_embeddings
       WHERE faq_id = ? AND embedding IS NOT NULL`,
      [faqId]
    );
    
    return results[0].count > 0;
  } catch (error) {
    console.error(`Error checking embedding existence for FAQ ${faqId}:`, error);
    return false;
  }
}

/**
 * Insert or update a FAQ embedding
 * @param {string} faqId - The FAQ ID
 * @param {string} question - The FAQ question
 * @param {string} answer - The FAQ answer
 * @param {Array} embedding - The embedding vector
 * @param {string} category - The FAQ category
 * @returns {Promise<Object>} Result of the operation
 */
export async function upsertFaqEmbedding(faqId, question, answer, embedding, category = 'general') {
  try {
    const embeddingStr = JSON.stringify(embedding);
    
    await executeQuery('START TRANSACTION');
    
    const embeddingExists = await executeQuery(
      `SELECT COUNT(*) as count FROM faq_embeddings WHERE faq_id = ?`,
      [faqId]
    );
    
    if (embeddingExists[0].count === 0) {
      await executeQuery(
        `INSERT INTO faq_embeddings (faq_id, question, answer, category, embedding, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [faqId, question, answer, category, embeddingStr]
      );
    } else {
      await executeQuery(
        `UPDATE faq_embeddings
         SET question = ?, answer = ?, category = ?, embedding = ?, updated_at = NOW()
         WHERE faq_id = ?`,
        [question, answer, category, embeddingStr, faqId]
      );
    }
    
    await executeQuery('COMMIT');
    
    return { success: true, faqId };
  } catch (error) {
    await executeQuery('ROLLBACK');
    console.error(`Error upserting FAQ embedding for ${faqId}:`, error);
    throw new DatabaseServiceError(`Failed to upsert FAQ embedding: ${error.message}`, 'FAQ_UPSERT_FAILED');
  }
}

export default {
  executeQuery,
  getSchemaInfo,
  DatabaseServiceError,
  getAllStoredFaqEmbeddings,
  getAllFaqsBasic,
  getFaqById,
  checkFaqEmbeddingExists,
  upsertFaqEmbedding
};
