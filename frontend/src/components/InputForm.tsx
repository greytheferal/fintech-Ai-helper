import React, { useState, FormEvent, KeyboardEvent } from 'react';
import { SendMessageFunction } from '../types/chat';
import { useChat } from '../contexts/ChatContext';

interface InputFormProps {
  onSendMessage: SendMessageFunction;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const { isApiAvailable } = useChat();
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText);
      setInputText('');
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
            placeholder={isApiAvailable === false ? "Service unavailable. Please try again later..." : "Type your message..."}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isApiAvailable === false}
            aria-label="Message input"
          />
        </div>
        <button
          type="submit"
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
            inputText.trim() && !isLoading && isApiAvailable !== false
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!inputText.trim() || isLoading || isApiAvailable === false}
          aria-label="Send message"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending
            </span>
          ) : (
            'Send'
          )}
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-500 flex justify-between">
        <span>Press Enter to send, Shift+Enter for a new line</span>
        <span className="text-right">{inputText.length} / 500 characters</span>
      </div>
    </form>
  );
};

export default InputForm;