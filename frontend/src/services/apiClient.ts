// API client for backend communication

import axios from 'axios';
import { ChatResponse } from '../types/chat';

// Create an axios
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Send a message to the chat API

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>('/chat', {
    userId: 'demo-user',
    message: message,
  });
  
  return response.data;
}

// Check if the backend server is doing sport ( healthy )

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get('/health', { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}