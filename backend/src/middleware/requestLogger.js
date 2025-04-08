
// And this is my request logging middleware. Pretty straight forword. Logs all incoming requests for debugging and monitoring

import { randomUUID } from 'crypto';


// Add a unique request ID to each request
export function requestIdMiddleware(req, res, next) {

  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
}


// Log incoming requests

export function requestLogger(req, res, next) {
  const start = Date.now();
  
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  };
  
  // Log when request is received
  console.log(`\u27a1\ufe0f [${logData.timestamp}] ${logData.method} ${logData.url}`);
  
  // Log response when finished - also added some colors to the status code for better visibility. Useful and also looks nice 
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    const statusSymbol = statusCode >= 500 ? '\ud83d\udd34' :  // Red circle for 5xx
                          statusCode >= 400 ? '\ud83d\udfe1' :  // Yellow circle for 4xx
                          statusCode >= 300 ? '\ud83d\udfe6' :  // Blue circle for 3xx
                          '\ud83d\udfe2';                        // Green circle for 2xx/1xx
    
    console.log(`${statusSymbol} [${logData.timestamp}] ${logData.method} ${logData.url} ${statusCode} - ${duration}ms`);
  });
  
  next();
}