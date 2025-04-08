import * as React from 'react';
import { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';

interface DevPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

interface QueryCategory {
  name: string;
  queries: {
    label: string;
    query: string;
  }[];
}

const DevPanel: React.FC<DevPanelProps> = ({ isOpen, onClose, userId = 'demo-user' }) => {
  const { clearChat, sendMessage } = useChat();
  const [activeTab, setActiveTab] = useState<string>('queries');
  const [modelMetrics, setModelMetrics] = useState<any>({
    totalQueries: 0,
    successRate: 0,
    avgResponseTime: 0,
    intentAccuracy: 0
  });

  const getEnvVar = (key: string, defaultVal: string = ''): string => {
    if (import.meta.env && Object.prototype.hasOwnProperty.call(import.meta.env, key)) {
      return import.meta.env[key as keyof ImportMetaEnv] || defaultVal;
    }
    return defaultVal;
  };

  const queryCategories: QueryCategory[] = [
    {
      name: 'Account Information',
      queries: [
        { label: 'Balance (General)', query: 'What is my current account balance?' },
        { label: 'Balance (Checking)', query: 'What is my checking account balance?' },
        { label: 'Balance (Savings)', query: 'Show me my savings account balance' },
        { label: 'Balance (All)', query: 'Show me all my account balances' },
      ]
    },
    {
      name: 'Transaction History',
      queries: [
        { label: 'Recent Transactions', query: 'Show me my recent transactions' },
        { label: 'By ID', query: 'What is the status of transaction TX123456?' },
        { label: 'By Date', query: 'Show transactions from last month' },
        { label: 'By Type', query: 'Show me my recent payments' },
        { label: 'By Merchant', query: 'Show transactions with Coffee Shop' },
      ]
    },
    {
      name: 'Transaction Processing',
      queries: [
        { label: 'Transfer Info', query: 'How do I transfer money between accounts?' },
        { label: 'Processing Time', query: 'How long do transfers usually take?' },
        { label: 'Payment Status', query: 'Is my payment to Electric Company complete?' },
        { label: 'Limits', query: 'What are my daily transfer limits?' },
      ]
    },
    {
      name: 'FAQs',
      queries: [
        { label: 'Password Reset', query: 'How do I reset my password?' },
        { label: 'Transfer Time', query: 'How long do transfers usually take?' },
        { label: 'Lost Card', query: 'What should I do if I lose my card?' },
        { label: 'Fees', query: 'What are the account maintenance fees?' },
        { label: 'FDIC Insurance', query: 'What is FDIC insurance and how does it protect me?' },
      ]
    },
    {
      name: 'Transaction Queries',
      queries: [
        { label: 'Pending Transaction', query: 'Why is my transaction still pending?' },
        { label: 'Transaction Detail', query: 'I want to know more about my transaction at Coffee Shop' },
        { label: 'Transfer Funds', query: 'I need to transfer $200 from my checking to savings' },
        { label: 'Recent Activity', query: 'Show me my transactions from the last week' },
        { label: 'Specific Merchant', query: 'Show me all my transactions with Grocery Store' },
        { label: 'Transaction Type', query: 'Show me all my deposits this month' },
      ]
    },
    {
      name: 'Historical Analysis',
      queries: [
        { label: 'Spending Pattern', query: 'Analyze my spending habits over the last 3 months' },
        { label: 'Category Spending', query: 'How much did I spend on dining out last month?' },
        { label: 'Balance Trend', query: 'How has my savings account balance changed over time?' },
        { label: 'Recurring Payments', query: 'What recurring subscriptions am I paying for?' },
        { label: 'Large Transactions', query: 'Show me my largest expenses in the past 60 days' },
      ]
    },
    {
      name: 'Transaction Education',
      queries: [
        { label: 'ACH vs Wire', query: 'What is the difference between ACH and wire transfers?' },
        { label: 'Transaction Process', query: 'Can you explain how transaction processing works?' },
        { label: 'Clearing Times', query: 'How long do different types of deposits take to clear?' },
        { label: 'Declined Cards', query: 'Why was my card declined?' },
        { label: 'Reading Transactions', query: 'How do I read and understand my transaction history?' },
        { label: 'Transaction Limits', query: 'What are the limits on different transaction types?' }, // Corrected line
      ]
    },
  ];

  const sendTestQuery = (query: string) => {
    sendMessage(query);
  };

  useEffect(() => {
    const handleDevTestQuery = (event: CustomEvent) => {
      if (event.detail && event.detail.query) {
        sendMessage(event.detail.query);
      }
    };

    document.addEventListener('dev-test-query', handleDevTestQuery as EventListener);

    return () => {
      document.removeEventListener('dev-test-query', handleDevTestQuery as EventListener);
    };
  }, [sendMessage]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-[80vh] overflow-auto m-4">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-medium text-gray-800">Developer Panel</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Environment</h4>
            <div className="bg-gray-50 p-2 rounded text-xs font-mono">
              <div>API URL: {getEnvVar('VITE_API_URL', 'http://localhost:3001/api')}</div>
              <div>Debug Mode: {getEnvVar('VITE_DEBUG_MODE', 'false')}</div>
              <div>User ID: {userId}</div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Test Queries</h4>
            <div className="grid grid-cols-2 gap-2">
              {queryCategories.flatMap(category => category.queries).map((test, index) => (
                <button
                  key={index}
                  onClick={() => sendTestQuery(test.query)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs py-1 px-2 rounded border border-blue-200 transition-colors"
                >
                  {test.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Actions</h4>
            <div className="flex space-x-2">
              <button
                onClick={clearChat}
                className="bg-red-50 hover:bg-red-100 text-red-700 text-xs py-1 px-2 rounded border border-red-200 transition-colors flex-1"
              >
                Clear Chat
              </button>
              <button
                onClick={onClose}
                className="bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs py-1 px-2 rounded border border-gray-200 transition-colors flex-1"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevPanel;