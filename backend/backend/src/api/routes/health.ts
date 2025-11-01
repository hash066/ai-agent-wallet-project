import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * GET /health/ready
 * Readiness check endpoint
 */
router.get('/ready', (req: Request, res: Response) => {
  // Add actual readiness checks here (database, blockchain connections, etc.)
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ok',
      blockchain: 'ok',
      ipfs: 'ok'
    }
  });
});

/**
 * GET /health/live
 * Liveness check endpoint
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export default router;
