// This script is for error handling middleware

// Handle 404 Not Found errors

export function notFoundHandler(req, res, next) {
  const requestId = req.requestId || 'N/A';
  console.warn(`[${requestId}] 404 Not Found - ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: {
      message: `The requested resource '${req.originalUrl}' was not found on this server.`,
      code: 'NOT_FOUND',
      requestId: requestId
    }
  });
}


// Global error handler for Express

export function errorHandler(err, req, res, next) {
  const requestId = req.requestId || 'N/A';
  console.error(`[${requestId}] Error occurred on ${req.method} ${req.originalUrl}:`, err);

  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600
    ? err.status
    : 500;

  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'UNKNOWN_ERROR');

  let userMessage = 'An unexpected error occurred. Please try again later.';
  if (statusCode < 500 && err.message) {
    userMessage = err.message;
  } else if (statusCode === 503) {
    userMessage = 'The service is temporarily unavailable. Please try again shortly.';
  }

  const errorResponse = {
    success: false,
    error: {
      message: userMessage,
      code: errorCode,
      requestId: requestId
    }
  };

  // Optionally add more details in development environment
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    errorResponse.error.details = err.message;
    errorResponse.error.stack = err.stack?.split('\n');
  }

  // Ensure headers are not already sent before sending response
  if (res.headersSent) {
    console.error(`[${requestId}] Headers already sent, cannot send error response.`);
    return next(err);
  }

  res.status(statusCode).json(errorResponse);
}