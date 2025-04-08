// Startup script to verify backend connectivity - Ignore this also , not needed anymore


import { API_CONFIG } from './config';
import { checkApiHealth } from './services';

// Verifies backend connectivity on application startup

export async function verifyBackendConnectivity(): Promise<boolean> {
  console.log(`Checking backend connectivity to: ${API_CONFIG.BASE_URL}`);
  
  try {
    const isConnected = await checkApiHealth();
    
    if (isConnected) {
      console.log(' Backend connection successful');
      return true;
    } else {
      console.warn(' Backend health check failed');
      console.error('Backend connection required. Please ensure the API server is running.');
      return false;
    }
  } catch (error) {
    console.error('Failed to connect to backend:', error);
    return false;
  }
}

export default { verifyBackendConnectivity };