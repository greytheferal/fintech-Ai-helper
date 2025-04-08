import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { checkApiHealth } from './services/apiService';

// Check backend health on startup
checkApiHealth()
  .then(isHealthy => {
    console.log(`Backend API status: ${isHealthy ? 'Connected' : 'Unavailable'}`);
    if (!isHealthy) {
      console.warn('Backend API is currently unavailable. Some features may not work.');
    }
  })
  .catch(error => {
    console.error('Error checking API health:', error);
  });


const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found!');
} else {
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}