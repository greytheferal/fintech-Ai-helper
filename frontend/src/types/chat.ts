
// TypeScript interfaces for the chat application


export interface Message {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: number;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

export interface SendMessageFunction {
  (text: string, userId?: string): Promise<void>;
}