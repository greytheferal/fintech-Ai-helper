import React, { useState, useEffect } from 'react';
import './index.css';
import ChatWindow from './components/ChatWindow';
import DevPanel from './components/DevPanel';
import { ChatProvider, useChat } from './contexts/ChatContext';

// Wrap the main content to use the useChat hook
const AppContent: React.FC = () => {
  const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);
  const { isApiAvailable, retryConnection } = useChat();
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">Financial Assistant</h1>
          <p className="text-gray-600 mt-2">Ask about your balance, transactions, or general questions</p>
          
          {/* API Connection Status */}
          <div className="mt-2 flex justify-center items-center text-sm">
            <div className={`h-2 w-2 rounded-full mr-2 ${
              isApiAvailable === null 
                ? 'bg-gray-400' 
                : isApiAvailable 
                  ? 'bg-green-500' 
                  : 'bg-red-500'
            }`}></div>
            <span className="text-gray-600">
              {isApiAvailable === null 
                ? 'Checking API connection...' 
                : isApiAvailable 
                  ? 'API Connected' 
                  : 'API Offline'}
            </span>
            {isApiAvailable === false && (
              <button 
                onClick={retryConnection}
                className="ml-2 text-blue-500 hover:text-blue-700 text-xs underline"
              >
                Retry Connection
              </button>
            )}
          </div>
        </header>
          
          <main>
            <ChatWindow />
          </main>
          
          <footer className="mt-12 text-center text-sm text-gray-500 flex flex-col items-center">
            <p>© 2025 Financial Services Platform. All rights reserved.</p>
            
            {/* Developer tools buttons */}
            <div className="mt-4 flex space-x-3">
              {/* Debugger button */}
              <button 
                onClick={() => setIsDebuggerOpen(true)}
                className="text-xs px-3 py-1 bg-black text-blue-400 border border-blue-400 font-mono rounded hover:bg-gray-900 hover:border-blue-300 transition-colors group flex items-center"
              >
                <span className="mr-2 inline-block w-2 h-2 bg-blue-400 rounded-full group-hover:animate-pulse"></span>
                <span className="tracking-wider">DEBUG CONSOLE</span>
              </button>
            </div>
          </footer>
        </div>

      
      {/* Debug Panel */}
      <DevPanel 
        isOpen={isDebuggerOpen} 
        onClose={() => setIsDebuggerOpen(false)} 
      />
    </div>
  );
};

// Main App component
const App: React.FC = () => {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
};

export default App;
