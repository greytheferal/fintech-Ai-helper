import React, { useRef, useEffect, useState } from 'react';
import MessageList from './MessageList';
import InputForm from './InputForm';
import { useChat } from '../contexts/ChatContext';

// Add debug logging
console.log('ChatWindow module loaded');

const ChatWindow: React.FC = () => {
  console.log('ChatWindow component rendering');
  const { messages, isLoading, isApiAvailable, sendMessage, clearChat, retryConnection } = useChat();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleClearChat = () => {
    if (showClearConfirm) {
      clearChat();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-700">Chat Assistant</h2>
          {/* Connection status indicator */}
          <div className="ml-3 flex items-center">
            <div className={`h-2 w-2 rounded-full mr-1 ${
              isApiAvailable === null 
                ? 'bg-gray-400' 
                : isApiAvailable 
                  ? 'bg-green-500' 
                  : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-500">
              {isApiAvailable === null 
                ? 'Checking...' 
                : isApiAvailable 
                  ? 'Online' 
                  : 'Offline'}
            </span>
            {isApiAvailable === false && (
              <button 
                onClick={retryConnection}
                className="ml-2 text-xs text-blue-500 hover:text-blue-700"
              >
                Retry
              </button>
            )}
          </div>
        </div>
        <div>
          {showClearConfirm ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Confirm clear?</span>
              <button 
                onClick={handleClearChat}
                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
              >
                Yes, clear
              </button>
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={handleClearChat}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>
      
      <MessageList messages={messages} />
      
      {isLoading && (
        <div className="px-4 py-2 text-sm text-gray-500 flex items-center">
          <span className="mr-2">Assistant is typing</span>
          <span className="flex">
            <span className="animate-bounce mx-px">.</span>
            <span className="animate-bounce mx-px animation-delay-200">.</span>
            <span className="animate-bounce mx-px animation-delay-400">.</span>
          </span>
        </div>
      )}
      
      <div ref={messagesEndRef} />
      
      <InputForm onSendMessage={sendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatWindow;