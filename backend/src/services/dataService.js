// Service to handle secure data retrieval from database


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


// Custom error class for data validation errors

export class DataValidationError extends Error {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'DataValidationError';
    this.code = code;
  }
}


// Get account balance for a user

export async function getBalance(userId, accountType = 'checking') {
  try {
    if (!userId) {
      throw new DataValidationError('User ID is required', 'USER_ID_REQUIRED');
    }
    
    // Get account balance for the user and specified type
    const [rows] = await pool.query(
      'SELECT account_id, account_type, account_subtype, balance, available_balance, currency FROM accounts WHERE user_id = ? AND account_type = ? LIMIT 1',
      [userId, accountType]
    );
    
    if (rows.length === 0) {
      throw new DataValidationError(`No ${accountType} account found for user ${userId}`, 'ACCOUNT_NOT_FOUND');
    }
    
    const account = rows[0];
    const balance = parseFloat(account.balance);
    const available = parseFloat(account.available_balance || account.balance);
    
    return {
      amount: balance,
      available: available,
      currency: account.currency || 'USD',
      accountId: account.account_id,
      accountType: account.account_type,
      accountSubtype: account.account_subtype,
      formattedAmount: `$${balance.toFixed(2)}`,
      formattedAvailable: `$${available.toFixed(2)}`,
      asOf: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error getting balance for user ${userId}:`, error);
    if (error instanceof DataValidationError) {
      throw error;
    }
    throw new Error(`Unable to retrieve balance information: ${error.message}`);
  }
}


// Get transaction status

export async function getTransactionStatus(userId, transactionId) {
  try {
    if (!userId) {
      throw new DataValidationError('User ID is required', 'USER_ID_REQUIRED');
    }
    
    let query, params;
    
    if (transactionId === 'latest') {
      // Get the most recent transaction for the user
      query = `
        SELECT t.*, a.account_type 
        FROM transactions t 
        JOIN accounts a ON t.account_id = a.account_id 
        WHERE a.user_id = ? 
        ORDER BY t.transaction_date DESC 
        LIMIT 1
      `;
      params = [userId];
    } else {
      // Get a specific transaction
      query = `
        SELECT t.*, a.account_type 
        FROM transactions t 
        JOIN accounts a ON t.account_id = a.account_id 
        WHERE a.user_id = ? AND t.transaction_id = ?
      `;
      params = [userId, transactionId];
    }
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length === 0) {
      return null;
    }
    
    const tx = rows[0];
    const amount = parseFloat(tx.amount);
    const formattedDate = new Date(tx.transaction_date).toLocaleDateString();
    
    // Convert the database row to my expected format
    return {
      id: tx.transaction_id,
      amount: amount,
      formattedAmount: `$${amount.toFixed(2)}`,
      date: tx.transaction_date,
      formattedDate: formattedDate,
      status: tx.status,
      recipient: tx.recipient,
      type: tx.transaction_type,
      description: tx.description,
      category: tx.category,
      accountType: tx.account_type
    };
  } catch (error) {
    console.error(`Error getting transaction for user ${userId}:`, error);
    if (error instanceof DataValidationError) {
      throw error;
    }
    throw new Error(`Unable to retrieve transaction information: ${error.message}`);
  }
}

// Get all accounts for a user

export async function getAllAccounts(userId) {
  try {
    if (!userId) {
      throw new DataValidationError('User ID is required', 'USER_ID_REQUIRED');
    }
    
    const [rows] = await pool.query(
      'SELECT * FROM accounts WHERE user_id = ? ORDER BY account_type',
      [userId]
    );
    
    if (rows.length === 0) {
      throw new DataValidationError(`No accounts found for user ${userId}`, 'ACCOUNTS_NOT_FOUND');
    }
    
    // Process rows into required format
    const accountsList = rows.map(account => {
      const type = account.account_type;
      const balance = parseFloat(account.balance);
      const available = parseFloat(account.available_balance || account.balance);
      
      return {
        accountId: account.account_id,
        accountNumber: account.account_number,
        type: type,
        typeLabel: type.charAt(0).toUpperCase() + type.slice(1),
        subtype: account.account_subtype,
        balance: `$${balance.toFixed(2)}`,
        available: `$${available.toFixed(2)}`,
        currency: account.currency || 'USD',
        status: account.status
      };
    });
    
    const creditAccount = rows.find(a => a.account_type === 'credit');
    
    return {
      accountsList,
      asOf: new Date().toISOString(),
      totalAccounts: rows.length,
      creditBalance: creditAccount ? parseFloat(creditAccount.balance) : null,
      creditAvailable: creditAccount ? parseFloat(creditAccount.available_balance || 0) : null
    };
  } catch (error) {
    console.error(`Error getting accounts for user ${userId}:`, error);
    if (error instanceof DataValidationError) {
      throw error;
    }
    throw new Error(`Unable to retrieve account information: ${error.message}`);
  }
}

// Get transaction list with optional filters

export async function getTransactionList(userId, filters = {}) {
  try {
    if (!userId) {
      throw new DataValidationError('User ID is required', 'USER_ID_REQUIRED');
    }
    
    console.log("Filters for transaction list:", JSON.stringify(filters));
    
    let query = `
      SELECT t.*, a.account_type 
      FROM transactions t 
      JOIN accounts a ON t.account_id = a.account_id 
      WHERE a.user_id = ?
    `;
    const queryParams = [userId];
    
    // Add time period filter if specified
    if (filters.timePeriod) {
      const now = new Date();
      let startDate;
      
      switch (filters.timePeriod) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          query += ' AND t.transaction_date >= ?';
          queryParams.push(startDate.toISOString().split('T')[0]);
          break;
        case 'this_week':
          // Get the Monday of current week
          const dayOfWeek = now.getDay();
          const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          startDate = new Date(now.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
          query += ' AND t.transaction_date >= ?';
          queryParams.push(startDate.toISOString().split('T')[0]);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          query += ' AND t.transaction_date >= ?';
          queryParams.push(startDate.toISOString().split('T')[0]);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          query += ' AND t.transaction_date >= ? AND t.transaction_date <= ?';
          queryParams.push(startDate.toISOString().split('T')[0]);
          queryParams.push(endDate.toISOString().split('T')[0]);
          break;
      }
    }
    
    // Add transaction type filter if specified
    if (filters.transactionType) {
      query += ' AND t.transaction_type = ?';
      queryParams.push(filters.transactionType);
    }
    
    // Add recipient filter if specified
    if (filters.recipient) {
      query += ' AND t.recipient LIKE ?';
      queryParams.push(`%${filters.recipient}%`);
    }
    
    // Add category filter if specified
    if (filters.category) {
      query += ' AND t.category = ?';
      queryParams.push(filters.category);
    }
    
    // Add order by and limit
    query += ' ORDER BY t.transaction_date DESC LIMIT 10';
    
    const [rows] = await pool.query(query, queryParams);
    
    // Format the results
    return rows.map(tx => {
      const amount = parseFloat(tx.amount);
      const formattedDate = new Date(tx.transaction_date).toLocaleDateString();
      
      return {
        id: tx.transaction_id,
        amount: amount,
        formattedAmount: `$${amount.toFixed(2)}`,
        date: tx.transaction_date,
        formattedDate: formattedDate,
        status: tx.status,
        recipient: tx.recipient,
        type: tx.transaction_type,
        description: tx.description,
        category: tx.category,
        accountType: tx.account_type
      };
    });
  } catch (error) {
    console.error(`Error getting transaction list for user ${userId}:`, error);
    if (error instanceof DataValidationError) {
      throw error;
    }
    throw new Error(`Unable to retrieve transactions: ${error.message}`);
  }
}

export default {
  getBalance,
  getTransactionStatus,
  getAllAccounts,
  getTransactionList,
  DataValidationError
};
