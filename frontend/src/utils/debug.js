// Utility functions for debugging

export function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'error':
      console.error(`${prefix} ERROR: ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix} WARNING: ${message}`);
      break;
    case 'info':
    default:
      console.info(`${prefix} INFO: ${message}`);
      break;
  }
}

// Debug utility for React component rendering

export function useComponentDebug(componentName) {
  return {
    renderStart: () => log(`${componentName} starting render`),
    renderComplete: () => log(`${componentName} render complete`),
    error: (message) => log(`${componentName} error: ${message}`, 'error'),
    warn: (message) => log(`${componentName} warning: ${message}`, 'warn'),
    info: (message) => log(`${componentName} info: ${message}`),
  };
}