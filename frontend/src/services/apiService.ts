// API Service for handling backend communication
import axios from 'axios';
import { ChatResponse } from '../types/chat';
import { API_CONFIG, FEATURES } from '../config';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Error handler to standardize errors from API

export class ApiError extends Error {
  status: number;
  code: string;
  isNetworkError: boolean;

  constructor(message: string, status = 500, code = 'UNKNOWN_ERROR', isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.isNetworkError = isNetworkError;
  }
}

// Check the health of the API

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.status === 200 && response.data?.status === 'ok';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Send a message to the chat API

export async function sendChatMessage(userId: string, message: string): Promise<ChatResponse> {
  try {
    if (FEATURES.LOG_API_CALLS) {
      console.log('Sending chat message to API:', { userId, message });
    }
    
    const response = await api.post('/chat', { userId, message });
    
    if (!response.data) {
      throw new ApiError('Empty response received from server', 500, 'EMPTY_RESPONSE');
    }
    
    if (response.data.success === false) {
      const errorMessage = response.data.error?.message || 'Unknown error';
      const errorCode = response.data.error?.code || 'API_ERROR';
      throw new ApiError(errorMessage, response.status, errorCode);
    }
    
    if (FEATURES.LOG_API_CALLS) {
      console.log('Received chat response:', response.data);
    }
    
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.message.includes('Network Error') || !error.response) {
        throw new ApiError(
          'Unable to connect to the server. Please check your connection and try again.',
          0,
          'NETWORK_ERROR',
          true
        );
      }
      
      const status = error.response?.status || 500;
      const serverMessage = error.response?.data?.error?.message || 'Unknown server error';
      const errorCode = error.response?.data?.error?.code || 'SERVER_ERROR';
      
      throw new ApiError(serverMessage, status, errorCode);
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(error.message || 'Unknown error occurred');
  }
}

export default api;