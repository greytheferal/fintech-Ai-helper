import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Message, SendMessageFunction } from '../types/chat';
import { checkApiHealth, sendChatMessage } from '../services/apiService';
import { CHAT_CONFIG, FEATURES } from '../config';

// Define chat context state
interface ChatContextState {
  messages: Message[];
  isLoading: boolean;
  isApiAvailable: boolean | null;
  error: string | null;
  sendMessage: SendMessageFunction;
  clearChat: () => void;
  retryConnection: () => Promise<void>;
}

// Create the context with default values
const ChatContext = createContext<ChatContextState>({
  messages: [],
  isLoading: false,
  isApiAvailable: null,
  error: null,
  sendMessage: async () => {},
  clearChat: () => {},
  retryConnection: async () => {},
});

// Props for the provider component
interface ChatProviderProps {
  children: ReactNode;
  userId?: string; // Optional user ID for auth sessions - fpr future use, right now it's useless
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ 
  children, 
  userId = CHAT_CONFIG.DEFAULT_USER_ID
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hello! I\'m your financial assistant. How can I help you today?',
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Function to clear all messages but no the initial greeting
  const clearChat = useCallback(() => {
    setMessages([
      {
        id: '1',
        sender: 'bot',
        text: 'Hello! I\'m your financial assistant. How can I help you today?',
        timestamp: Date.now(),
      },
    ]);
    setError(null);
  }, []);
  
  // Function to check API availability
  const checkApiAvailability = useCallback(async () => {
    try {
      const startTime = Date.now();
      
      const isHealthy = await checkApiHealth();
      
      const latency = Date.now() - startTime;
      
      const apiCallEvent = new CustomEvent('api-call', {
        detail: {
          timestamp: new Date().toISOString(),
          endpoint: 'health',
          status: isHealthy ? 200 : 500,
          latency: latency,
          method: 'GET'
        }
      });
      document.dispatchEvent(apiCallEvent);
      
      setIsApiAvailable(isHealthy);
      return isHealthy;
    } catch (error) {
      console.error('API health check failed:', error);
      

      const apiCallEvent = new CustomEvent('api-call', {
        detail: {
          timestamp: new Date().toISOString(),
          endpoint: 'health',
          status: 500, 
          latency: 0,
          method: 'GET'
        }
      });
      document.dispatchEvent(apiCallEvent);
      
      setIsApiAvailable(false);
      return false;
    }
  }, []);
  

  useEffect(() => {
    checkApiAvailability();
    const intervalId = setInterval(checkApiAvailability, CHAT_CONFIG.HEALTH_CHECK_INTERVAL);
    return () => clearInterval(intervalId);
  }, [checkApiAvailability]);
  
  // Function to retry connection
  const retryConnection = useCallback(async () => {
    setIsApiAvailable(null);
    await checkApiAvailability();
  }, [checkApiAvailability]);
  
  // Debug flag from config - didn't use it in the code but maybe i will make use of it sometimes
  const isDebugMode = (): boolean => {
    return FEATURES.ENABLE_DEBUG_PANEL;
  };
  
  // Function to send a message to the backend
  const sendMessage = useCallback(async (text: string, customUserId?: string) => {
    if (!text.trim()) return;
    
    const effectiveUserId = customUserId || userId;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = Date.now();
      
      const response = await sendChatMessage(effectiveUserId, text);
      
      const latency = Date.now() - startTime;
      
      const apiCallEvent = new CustomEvent('api-call', {
        detail: {
          timestamp: new Date().toISOString(),
          endpoint: 'chat',
          status: 200, // if it's working its 200 
          latency: latency,
          method: 'POST',
          userQuery: text,
          aiResponse: response.data?.response || 'No response',
          promptTokens: Math.floor(text.length / 4),
          completionTokens: Math.floor((response.data?.response?.length || 0) / 4)
        }
      });
      document.dispatchEvent(apiCallEvent);
      
      // Add a response from the bot 
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: response.data?.response || 'Sorry, I received an invalid response format.',
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, botMessage]);
      
    } catch (err: any) {
      console.error('Error sending message:', err);
      
      if (err.isNetworkError) {
        setIsApiAvailable(false);
      }
      
      const errorBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `Sorry, I encountered an error: ${err.message}. Please try again later.`,
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, errorBotMessage]);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
  
  const contextValue: ChatContextState = {
    messages,
    isLoading,
    isApiAvailable,
    error,
    sendMessage,
    clearChat,
    retryConnection,
  };
  
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;