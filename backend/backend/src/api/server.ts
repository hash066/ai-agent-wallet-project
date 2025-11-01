import * as dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { json, urlencoded } from 'body-parser';

// Import routes
import authRouter from './routes/auth';
import agentsRouter from './routes/agents';
import intentsRouter from './routes/intents';
import { auditRouter } from './routes/audit';
import healthRouter from './routes/health';
import marketplaceRouter from './routes/marketplace';
import collaborationRouter from './routes/collaboration';

// Import middleware
import { rateLimitMiddleware, validateInput } from './middleware/rateLimit';
import { verifyToken } from './middleware/auth';

// Import utilities
import logger from '../utils/logger';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration - allow frontend ports
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Logging middleware
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));

// Body parsing middleware
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimitMiddleware);

// Input validation
app.use('/api', validateInput);

// Health check (no auth required)
app.use('/health', healthRouter);

// Authentication routes (public)
app.use('/api/auth', authRouter);
logger.info('Auth routes registered at /api/auth');

// API routes - AUTHENTICATION DISABLED (open access)
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/intents', intentsRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/marketplace', marketplaceRouter);
app.use('/api/v1/collaboration', collaborationRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);

  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`AI Agent Wallet API server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS origins: ${corsOrigins.join(', ')}`);
    logger.info('Available routes:');
    logger.info('  - GET  /health');
    logger.info('  - POST /api/auth/register');
    logger.info('  - POST /api/auth/login');
    logger.info('  - POST /api/auth/verify-email');
    logger.info('  - POST /api/auth/forgot-password');
    logger.info('  - POST /api/auth/reset-password');
    logger.info('  - GET  /api/auth/me (protected)');
  });
}

export default app;
