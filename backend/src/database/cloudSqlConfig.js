/*
 * Google Cloud SQL Database Configuration. Basically what this script does : establishes connection pool to MySQL database and initializes required tables schema.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file with absolute path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Debug: Print environment variables to verify they're loaded correctly
console.log('DEBUG - Environment Variables:');
console.log(`DB_HOST: ${process.env.DB_HOST}`);
console.log(`DB_USER: ${process.env.DB_USER}`);
console.log(`DB_NAME: ${process.env.DB_NAME}`);
console.log(`DB_PORT: ${process.env.DB_PORT}`);

// Get MySQL configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'financial_user',
  password: process.env.DB_PASSWORD || 'default_password',
  database: process.env.DB_NAME || 'financial_chatbot_db',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: process.env.DB_CONN_LIMIT ? parseInt(process.env.DB_CONN_LIMIT) : 10,
  queueLimit: 0,
  connectTimeout: 15000
};

// Create connection pool
let pool;
try {
  pool = mysql.createPool(dbConfig);
  console.log(`MySQL connection pool created for database '${dbConfig.database}' on ${dbConfig.host}`);
} catch (error) {
  console.error(`FATAL ( Houston we have a problem ): Failed to create MySQL connection pool: ${error.message}`);
  console.error("Check your .env file and ensure MySQL server is running and accessible.");
  process.exit(1);
}


// Test the database connection

export async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log(`Successfully connected to MySQL database: ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (error) {
    console.error(`Failed to connect to MySQL database: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Hint: Ensure MySQL server is running and network allows connection.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Hint: Check DB_USER and DB_PASSWORD in your .env file.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`   Hint: Database "${dbConfig.database}" may not exist. Attempting creation...`);
    } else {
      console.error(`   Unhandled MySQL connection error code: ${error.code}`);
    }
    return false;
  } finally {
    if (connection) connection.release();
  }
}

 // Initialize database tables required for the application
export async function initializeDatabase() {
  // Check connection first before attempting table creation
  const canConnect = await testConnection();
  if (!canConnect) {
      throw new Error("Cannot initialize database tables: Failed to connect to the database.");
  }

  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Ensuring database tables exist...');

    // Use InnoDB and proper charset/collation
    const tableOptions = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(50) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ${tableOptions};
    `);
    console.log('   - users table OK');

    // Create accounts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id VARCHAR(36) PRIMARY KEY, -- Increased length for potential UUIDs
        user_id VARCHAR(50) NOT NULL,
        account_type VARCHAR(20) NOT NULL,
        account_subtype VARCHAR(30),
        balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- Increased precision
        available_balance DECIMAL(15, 2), -- Increased precision
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX(user_id),
        INDEX(account_type)
      ) ${tableOptions};
    `);
    console.log('   - accounts table OK');

    // Create transactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id VARCHAR(50) PRIMARY KEY, -- Increased length
        account_id VARCHAR(36) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL, -- Increased precision
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'completed',
        transaction_type VARCHAR(30), -- Increased length
        recipient VARCHAR(150), -- Increased length
        description TEXT,
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
        INDEX(account_id),
        INDEX(transaction_date),
        INDEX(transaction_type),
        INDEX(status)
      ) ${tableOptions};
    `);
    console.log('   - transactions table OK');

    // Create chat_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(50), -- Increased length
        user_id VARCHAR(50) NOT NULL,
        user_query TEXT NOT NULL,
        detected_intent VARCHAR(50),
        bot_response MEDIUMTEXT NOT NULL, -- Allow longer responses
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        model VARCHAR(50),
        processing_time_ms INT,
        prompt_tokens INT,
        completion_tokens INT,
        total_tokens INT,
        faq_matches INT,
        request_id VARCHAR(50), -- Added request ID tracking
        data_retrieval_error TEXT, -- Store data retrieval errors
        INDEX(user_id),
        INDEX(timestamp),
        INDEX(detected_intent)
      ) ${tableOptions};
    `);
    console.log('   - chat_logs table OK');

    // Create faq_embeddings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS faq_embeddings (
        faq_id VARCHAR(50) PRIMARY KEY, -- Increased length
        question TEXT NOT NULL,
        answer MEDIUMTEXT NOT NULL, -- Allow longer answers
        category VARCHAR(50),
        embedding JSON, -- Keep as JSON, consider specialized types if needed later
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(category)
      ) ${tableOptions};
    `);
    console.log('   - faq_embeddings table OK');

    console.log(' Database schema initialization check complete.');

  } catch (error) {
    console.error(' Database schema initialization error:', error);
    throw error;
  } finally {
       if(connection) connection.release();
  }
}

export default pool;