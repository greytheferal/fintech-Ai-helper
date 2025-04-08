// Mock API Service for testing without a backend - useless now cuz i have a backend and db setup

import { ChatResponse } from '../types/chat';

// Simple mock database for demo purposes
const MOCK_DB = {
  users: {
    'demo-user': {
      id: 'demo-user',
      name: 'Demo User',
      accounts: [
        { 
          id: 'acct-001',
          type: 'checking',
          balance: 5432.10,
          available: 5432.10
        },
        {
          id: 'acct-002',
          type: 'savings',
          balance: 12500.00,
          available: 12500.00
        },
        {
          id: 'acct-003',
          type: 'credit',
          balance: -350.00,
          available: 9650.00,
          limit: 10000.00
        }
      ],
      transactions: [
        {
          id: 'tx-001',
          date: '2023-08-15',
          amount: -42.50,
          description: 'Coffee Shop',
          status: 'completed',
          accountId: 'acct-001'
        },
        {
          id: 'tx-002',
          date: '2023-08-14',
          amount: -127.30,
          description: 'Grocery Store',
          status: 'completed',
          accountId: 'acct-001'
        },
        {
          id: 'tx-003',
          date: '2023-08-13',
          amount: 1500.00,
          description: 'Payroll Deposit',
          status: 'completed',
          accountId: 'acct-001'
        }
      ]
    }
  },
  faqs: [
    {
      id: 'faq-001',
      question: 'How do I reset my password?',
      answer: 'You can reset your password by clicking the "Forgot Password" link on the login page.'
    },
    {
      id: 'faq-002',
      question: 'What are the transfer limits?',
      answer: 'Standard accounts have a daily transfer limit of $5,000 and a monthly limit of $20,000.'
    }
  ]
};


// Mock function to simulate API health check
export async function mockCheckApiHealth(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return true;
}

// Mock function to simulate sending a chat message

export async function mockSendChatMessage(userId: string, message: string): Promise<ChatResponse> {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const user = MOCK_DB.users[userId];
  if (!user) {
    return {
      success: false,
      error: {
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      }
    };
  }
  
  // Simple intent detection based on keywords
  const lowerMessage = message.toLowerCase();
  let response: string;
  
  if (lowerMessage.includes('balance')) {
    const accounts = user.accounts;
    response = `Here are your account balances:\\n` +
      `- Checking: $${accounts[0].balance.toFixed(2)}\\n` +
      `- Savings: $${accounts[1].balance.toFixed(2)}\\n` +
      `- Credit Card: $${Math.abs(accounts[2].balance).toFixed(2)} (Available: $${accounts[2].available.toFixed(2)})`;
  } 
  else if (lowerMessage.includes('transaction') || lowerMessage.includes('recent')) {
    const recentTx = user.transactions[0];
    response = `Your most recent transaction was ${recentTx.description} for $${Math.abs(recentTx.amount).toFixed(2)} on ${recentTx.date}. Status: ${recentTx.status}.`;
  }
  else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    response = 'I can help you with account balances, recent transactions, and general banking questions. How can I assist you today?';
  }
  else if (lowerMessage.includes('password')) {
    response = MOCK_DB.faqs[0].answer;
  }
  else if (lowerMessage.includes('limit')) {
    response = MOCK_DB.faqs[1].answer;
  }
  else {
    response = 'I understand you\'re asking about ' + message + '. Could you please provide more specific details so I can assist you better?';
  }
  
  return {
    success: true,
    data: {
      response: response
    }
  };
}

export default {
  mockCheckApiHealth,
  mockSendChatMessage
};