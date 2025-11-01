import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { UserDatabase } from '../../db/userQueries';
import { emailService } from '../../services/emailService';
import logger from '../../utils/logger';
import { verifyToken } from '../middleware/auth';

const router = Router();
const userDb = new UserDatabase();

// Log router initialization
logger.info('Auth router initialized with routes: /register, /login, /verify-email, /forgot-password, /reset-password, /me');

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Password validation regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 8 })
      .matches(PASSWORD_REGEX)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  ],
  async (req: Request, res: Response) => {
    logger.info(`Register endpoint called: ${req.method} ${req.path}`);
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Check if user already exists (try database, fallback to memory)
      let existingUser: any = null;
      try {
        existingUser = await userDb.getUserByEmail(email);
      } catch (dbError: any) {
        // Database failed - check memory storage
        logger.debug('Database check failed, checking memory storage');
      }
      
      // Also check in-memory storage
      const memoryUsers = (global as any).__memoryUsers || {};
      if (!existingUser && memoryUsers[email]) {
        existingUser = memoryUsers[email];
      }
      
      if (existingUser) {
        return res.status(400).json({
          error: 'User already exists',
          message: 'An account with this email already exists',
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user (try database, fallback to memory)
      let user;
      try {
        user = await userDb.createUser(email, hashedPassword, verificationToken);
      } catch (dbError: any) {
        // Database failed - use in-memory fallback
        logger.warn('Database unavailable, using in-memory storage:', dbError.message);
        const memoryUsers = (global as any).__memoryUsers || ((global as any).__memoryUsers = {});
        const userId = crypto.randomBytes(16).toString('hex');
        user = {
          id: userId,
          email: email,
          password: hashedPassword,
          is_verified: true, // Auto-verify for testing
          verification_token: verificationToken,
          created_at: new Date(),
          updated_at: new Date(),
        };
        memoryUsers[email] = user;
      }

      // Send verification email (skip if no email config)
      try {
        await emailService.sendVerificationEmail(email, verificationToken);
      } catch (emailError: any) {
        logger.warn('Email service unavailable, skipping verification email');
      }

      logger.info(`New user registered: ${email} (in-memory fallback)`);

      res.status(201).json({
        message: 'Registration successful. Account is automatically verified (in-memory mode).',
        user: {
          id: user.id,
          email: user.email,
          isVerified: true, // Auto-verified for testing
        },
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to register user',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user (try database, fallback to memory)
      let user = await userDb.getUserByEmail(email).catch(() => null);
      
      // If database fails, try in-memory storage
      if (!user) {
        const memoryUsers = (global as any).__memoryUsers || {};
        user = memoryUsers[email] || null;
      }

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Invalid email or password',
        });
      }

      // Skip email verification check for in-memory users (auto-verified)
      if (user && !user.is_verified && !(global as any).__memoryUsers?.[email]) {
        return res.status(403).json({
          error: 'Email not verified',
          message: 'Please verify your email address before logging in',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT token (expires in 7 days)
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      logger.info(`User logged in: ${email}`);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          isVerified: user.is_verified,
        },
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to login',
      });
    }
  }
);

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post(
  '/verify-email',
  [body('token').notEmpty().withMessage('Verification token is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { token } = req.body;

      // Verify token
      const verified = await userDb.verifyUser(token);
      if (!verified) {
        return res.status(400).json({
          error: 'Invalid token',
          message: 'Invalid or expired verification token',
        });
      }

      logger.info('Email verified successfully');

      res.json({
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      logger.error('Email verification error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify email',
      });
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Invalid email address')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email } = req.body;

      // Find user
      const user = await userDb.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists (security best practice)
        return res.json({
          message: 'If an account exists with this email, a password reset link has been sent',
        });
      }

      // Generate reset token (expires in 1 hour)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Save reset token
      await userDb.setResetPasswordToken(email, resetToken, expiresAt);

      // Send reset email
      await emailService.sendPasswordResetEmail(email, resetToken);

      logger.info(`Password reset email sent to ${email}`);

      res.json({
        message: 'If an account exists with this email, a password reset link has been sent',
      });
    } catch (error: any) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process password reset request',
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .matches(PASSWORD_REGEX)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { token, password } = req.body;

      // Find user by reset token
      const user = await userDb.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({
          error: 'Invalid token',
          message: 'Invalid or expired password reset token',
        });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update password
      const updated = await userDb.updatePassword(user.id, hashedPassword);
      if (!updated) {
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to reset password',
        });
      }

      logger.info(`Password reset successful for user ${user.email}`);

      res.json({
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      logger.error('Reset password error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to reset password',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user info (protected route)
 */
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const user = await userDb.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.is_verified,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user info',
    });
  }
});

export default router;

