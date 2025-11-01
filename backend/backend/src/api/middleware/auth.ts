import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token middleware
 * Extracts user info from token and attaches to req.user
 */
export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided. Please provide a valid JWT token.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    // Attach user info to request
    (req as any).user = decoded;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid authentication token.',
      });
    }

    logger.error('Token verification error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Failed to authenticate token.',
    });
  }
};

/**
 * Legacy authentication middleware (for backward compatibility)
 * Now checks for JWT token first, then falls back to API key
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Try JWT token first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyToken(req, res, next);
  }

  // Fallback to API key check (for backward compatibility)
  if (process.env.NODE_ENV === 'development' && !process.env.REQUIRE_AUTH) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return next();
  }

  // No auth provided
  logger.warn(`Unauthorized access attempt to ${req.path} from ${req.ip}`);
  res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication required. Please provide JWT token or API key.',
    timestamp: new Date().toISOString()
  });
};

