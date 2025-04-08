import React from 'react';
import { Message } from '../types/chat';

type MessageItemProps = Pick<Message, 'sender' | 'text' | 'timestamp'>;

const MessageItem: React.FC<MessageItemProps> = ({ sender, text, timestamp }) => {
  const isUser = sender === 'user';
  const isSystem = sender === 'system';
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const containerClass = isSystem 
    ? 'justify-center' 
    : (isUser ? 'justify-end' : 'justify-start');
  
  const messageClass = isSystem
    ? 'bg-yellow-50 text-gray-700 border border-yellow-200 rounded-lg' 
    : (isUser 
        ? 'bg-blue-600 text-white rounded-br-none' 
        : 'bg-gray-100 text-gray-800 rounded-bl-none');
        
  const timeClass = isSystem
    ? 'text-gray-400'
    : (isUser ? 'text-blue-200' : 'text-gray-500');
  
  return (
    <div className={`flex ${containerClass} message-animation`}>
      <div className={`max-w-[80%] rounded-lg px-4 py-2 ${messageClass}`}>
        {isSystem && <div className="text-xs font-semibold text-yellow-600 mb-1">System Message</div>}
        <div className="text-sm">{text}</div>
        <div className={`text-xs mt-1 ${timeClass}`}>
          {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;