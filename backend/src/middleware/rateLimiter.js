
// For this scripts we have : Rate limiting middleware. And basically , it protects API endpoints from abuse by limiting request rates


// Simple in-memory rate limiter
const ipRequestMap = new Map();


// Rate limiter middleware factory
export function rateLimiter({ windowMs = 60000, maxRequests = 30 }) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const now = Date.now();
    
    if (!ipRequestMap.has(ip)) {
      ipRequestMap.set(ip, {
        requests: [],
        blocked: false,
        blockedUntil: 0
      });
    }
    
    const record = ipRequestMap.get(ip);
    
    if (record.blocked && now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMITED',
          retryAfter
        }
      });
    }
    
    if (record.blocked && now >= record.blockedUntil) {
      record.blocked = false;
      record.requests = [];
    }
    
    record.requests = record.requests.filter(timestamp => now - timestamp < windowMs);
    
    if (record.requests.length >= maxRequests) {
      record.blocked = true;
      record.blockedUntil = now + (windowMs * 2);
      
      const retryAfter = Math.ceil(windowMs * 2 / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMITED',
          retryAfter
        }
      });
    }
    
    record.requests.push(now);
    
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - record.requests.length).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000).toString());
    
    next();
  };
}

// Cleanup old records periodically (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  
  for (const [ip, record] of ipRequestMap.entries()) {
    const oldestRequest = Math.max(...record.requests);
    if (now - oldestRequest > 3600000) {
      ipRequestMap.delete(ip);
    }
  }
}, 900000);