import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import chatRoutes from './routes/chat.js';
import developerRoutes from './routes/developerRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { requestLogger, requestIdMiddleware } from './middleware/requestLogger.js';

import pool, { testConnection, initializeDatabase } from './database/cloudSqlConfig.js';
import { initializeFaqEmbeddings } from './services/faqService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Init logic
async function initializeApp() {
  console.log(" Initializing Financial Chatbot Backend...");

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error(" Critical Error: Database connection failed. Cannot start server.");
    process.exit(1);
  }

  try {
    await initializeDatabase();
    console.log(" Database schema initialized successfully.");
  } catch (dbInitError) {
    console.error(" Critical No-No: Failed to initialize database schema:", dbInitError);
    process.exit(1);
  }

  try {
    await initializeFaqEmbeddings();
    console.log(" FAQ Embeddings initialized successfully.");
  } catch (faqError) {
    console.error(" Warning: Failed to initialize FAQ embeddings:", faqError);
  }

  console.log(" Backend initialization complete.");
}

// Middleware Config
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:5173"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }));

// Route Config
app.use('/api/chat', chatRoutes);
app.use('/api/developer', developerRoutes);

// Health check endpoint - just something simple , its just a ping from time to time
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), service: 'financial-chatbot-backend' });
});

// Root route - basic API info
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Financial Chatbot API',
    version: '0.1.0',
    status: 'Running',
    documentation_hint: 'See /api/health and /api/developer/metrics'
  });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Shutdown
function shutdown(signal) {
  console.log(`\n Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log("   - HTTP server closed.");
    try {
      if (pool) {
          await pool.end(); 
          console.log("   - Database pool closed.");
      }
    } catch (err) {
        console.error("   - Error closing database pool:", err);
    }
    console.log(" Server shutdown complete.");
    process.exit(0);
  });

  // Force shutdown
  setTimeout(() => {
    console.error(" Could not close connections in time, forcing shutdown.");
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start sv
let server;
initializeApp().then(() => {
  server = app.listen(PORT, () => {
    console.log(` Server listening on port ${PORT}`);
    console.log(` Access API root at http://localhost:${PORT}/`);
    console.log(` Health check at http://localhost:${PORT}/api/health`);
  });

  server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
          console.error(` Error: Port ${PORT} is already in use. Please close the other process or use a different port.`);
      } else {
          console.error(" Server startup error:", error);
      }
      process.exit(1);
  });

}).catch(initializationError => {
    console.error(" Fatal error during application initialization:", initializationError);
    process.exit(1);
});