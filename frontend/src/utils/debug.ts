// Debug logging utility


type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_LEVEL_COLORS = {
  info: '#4299E1', // blue
  warn: '#ECC94B', // yellow
  error: '#F56565', // red
  debug: '#9F7AEA', // purple
};

// Log messages with a specified level

export function log(message: string, level: LogLevel = 'info'): void {
  if (process.env.NODE_ENV !== 'production') {
    const style = `color: ${LOG_LEVEL_COLORS[level]}; font-weight: bold;`;
    
    console.log(`%c[${level.toUpperCase()}]`, style, message);
  }
}