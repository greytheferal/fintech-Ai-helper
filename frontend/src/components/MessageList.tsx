import React from 'react';
import MessageItem from './MessageItem';
import { Message } from '../types/chat';

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageItem 
          key={message.id} 
          sender={message.sender} 
          text={message.text} 
          timestamp={message.timestamp} 
        />
      ))}
    </div>
  );
};

export default MessageList;