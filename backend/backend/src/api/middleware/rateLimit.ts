import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../../utils/logger';

/**
 * Input validation middleware
 * Validates common input patterns
 */
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Check for malicious patterns in request body
  const checkObject = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      // Check for common injection patterns
      if (obj.includes('<script') || obj.includes('javascript:') || obj.includes('onload=')) {
        logger.warn(`Potential XSS attempt in ${path}: ${obj.substring(0, 100)}...`);
        return false;
      }
      // Check string length limits
      if (obj.length > 10000) {
        logger.warn(`Input too long in ${path}: ${obj.length} characters`);
        return false;
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (!checkObject(value, `${path}.${key}`)) {
          return false;
        }
      }
    }
    return true;
  };

  if (!checkObject(req.body) || !checkObject(req.query)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid input detected'
    });
  }

  next();
};

/**
 * Rate limiting middleware
 * Prevents abuse by limiting requests per IP
 */

// General API rate limiter
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Stricter rate limiter for agent operations
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});
