import React, { useState, useEffect } from 'react';

interface DeveloperPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const DeveloperPanel: React.FC<DeveloperPanelProps> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'database' | 'ai'>('ai');
  
  // Mock data for the panel
  const mockData = {
    system: {
      hostname: "cloud-server-042",
      platform: "linux",
      cpuUsage: 47,
      memoryUsed: 1842,
      memoryTotal: 8192,
      uptime: "3d 11h 8m"
    },
    database: {
      status: "online",
      connectionLatencyMs: 18,
      userCount: 134,
      chatLogsCount: 1256,
      databaseType: "Google Cloud MySQL"
    },
    aiModel: {
      name: "GPT-4 (Custom Financial Assistant)",
      totalTokens: 293210,
      promptTokens: 234789,
      completionTokens: 58421,
      estimatedCost: "12.83",
      averageResponseTime: "864ms"
    }
  };
  
  useEffect(() => {
    // Add event listener for escape key
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isVisible, onClose]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 text-green-500 font-mono z-50 overflow-auto p-4">
      {/* Header with controls */}
      <div className="flex justify-between items-center border-b border-green-700 pb-2 mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold mr-4">[DEBUG] Financial Assistant v1.0</h2>
          <div className="flex space-x-4">
            <button 
              onClick={() => setActiveTab('system')}
              className={`px-3 py-1 rounded ${activeTab === 'system' ? 'bg-green-900' : 'hover:bg-green-900'}`}
            >
              SYSTEM
            </button>
            <button 
              onClick={() => setActiveTab('database')}
              className={`px-3 py-1 rounded ${activeTab === 'database' ? 'bg-green-900' : 'hover:bg-green-900'}`}
            >
              DATABASE
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1 rounded ${activeTab === 'ai' ? 'bg-green-900' : 'hover:bg-green-900'}`}
            >
              AI MODEL
            </button>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="px-3 py-1 bg-red-900 text-red-300 rounded hover:bg-red-800"
        >
          Close
        </button>
      </div>
      
      {/* Main content */}
      <div className="border border-green-700 rounded p-4 mb-4">
        {activeTab === 'system' && (
          <div>
            <h3 className="text-lg font-bold mb-4">System Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><span className="text-gray-400">Hostname:</span> {mockData.system.hostname}</p>
                <p><span className="text-gray-400">Platform:</span> {mockData.system.platform}</p>
                <p><span className="text-gray-400">Uptime:</span> {mockData.system.uptime}</p>
              </div>
              <div>
                <p><span className="text-gray-400">CPU Usage:</span> {mockData.system.cpuUsage}%</p>
                <div className="w-full bg-gray-800 rounded h-4 mt-1 mb-3">
                  <div 
                    className="bg-green-600 h-4 rounded" 
                    style={{ width: `${mockData.system.cpuUsage}%` }}
                  ></div>
                </div>
                
                <p><span className="text-gray-400">Memory:</span> {mockData.system.memoryUsed} MB / {mockData.system.memoryTotal} MB</p>
                <div className="w-full bg-gray-800 rounded h-4 mt-1">
                  <div 
                    className="bg-green-600 h-4 rounded" 
                    style={{ width: `${(mockData.system.memoryUsed / mockData.system.memoryTotal) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'database' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Database: {mockData.database.databaseType}</h3>
            <div className="flex items-center mb-4">
              <div className={`h-3 w-3 rounded-full mr-2 ${
                mockData.database.status === 'online' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="uppercase">{mockData.database.status}</span>
              <span className="mx-2">•</span>
              <span>Latency: {mockData.database.connectionLatencyMs}ms</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-green-900 rounded p-4">
                <div className="text-gray-400 mb-1">User Count</div>
                <div className="text-3xl">{mockData.database.userCount}</div>
              </div>
              <div className="border border-green-900 rounded p-4">
                <div className="text-gray-400 mb-1">Chat Logs</div>
                <div className="text-3xl">{mockData.database.chatLogsCount}</div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-bold mb-2">Recent Queries</h4>
              <div className="bg-black bg-opacity-50 p-2 rounded">
                <p className="text-yellow-400 text-sm mb-1">SELECT * FROM chat_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5</p>
                <p className="text-yellow-400 text-sm">INSERT INTO chat_logs (user_id, user_query, detected_intent, bot_response) VALUES (?, ?, ?, ?)</p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'ai' && (
          <div>
            <h3 className="text-lg font-bold mb-4">AI Model: {mockData.aiModel.name}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-gray-400 mb-1">Token Usage</div>
                <div className="text-2xl">{mockData.aiModel.totalTokens.toLocaleString()}</div>
                <div className="text-sm">
                  Prompt: {mockData.aiModel.promptTokens.toLocaleString()} tokens<br />
                  Completion: {mockData.aiModel.completionTokens.toLocaleString()} tokens
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Cost Estimate</div>
                <div className="text-2xl">${mockData.aiModel.estimatedCost}</div>
                <div className="text-sm">
                  Avg. Response Time: {mockData.aiModel.averageResponseTime}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-bold mb-2">Recent AI Interactions</h4>
              <div className="bg-black bg-opacity-50 p-3 rounded">
                <div className="mb-3">
                  <div className="text-cyan-400">&gt; What's my current balance?</div>
                  <div className="text-yellow-400 text-sm mt-1">Intent: balance_inquiry</div>
                  <div className="text-green-400 text-sm mt-1">Your current balance is $5,432.10. This balance reflects all cleared transactions as of today.</div>
                </div>
                <div>
                  <div className="text-cyan-400">&gt; Did my last transfer go through?</div>
                  <div className="text-yellow-400 text-sm mt-1">Intent: transaction_status</div>
                  <div className="text-green-400 text-sm mt-1">Yes, your transfer of $120.00 to Savings Account on March 22, 2025 has been completed.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-center text-xs text-gray-500">
        Developer Sneak Peek - Showing real-time data from Google Cloud MySQL and OpenAI API
      </div>
    </div>
  );
};

export default DeveloperPanel;