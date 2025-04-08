// App config

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Chat configuration
export const CHAT_CONFIG = {
  DEFAULT_USER_ID: 'demo-user',
  HEALTH_CHECK_INTERVAL: 30000,
};

// Feature flags
export const FEATURES = {
  ENABLE_DEBUG_PANEL: import.meta.env.VITE_ENABLE_DEBUG !== 'false',
  LOG_API_CALLS: true,
};

export default {
  API_CONFIG,
  CHAT_CONFIG,
  FEATURES,
};