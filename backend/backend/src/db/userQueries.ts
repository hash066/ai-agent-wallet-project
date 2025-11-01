import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import logger from '../utils/logger';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface User {
  id: string;
  email: string;
  password: string;
  is_verified: boolean;
  verification_token: string | null;
  reset_password_token: string | null;
  reset_password_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class UserDatabase {
  private pool: Pool;

  constructor(config?: DatabaseConfig) {
    // Support Supabase connection string (DATABASE_URL)
    // If DATABASE_URL is provided, use it directly (Supabase style)
    const databaseUrl = process.env.DATABASE_URL;
    
    let poolConfig: DatabaseConfig | string;
    
    if (databaseUrl) {
      // Use connection string directly (Supabase provides this)
      poolConfig = databaseUrl;
      logger.info('Using DATABASE_URL connection string for Supabase');
    } else {
      // Fallback to individual config values
      const defaultConfig: DatabaseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'ai_agent_wallet',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // Increased for cloud connections
      };
      poolConfig = config || defaultConfig;
      logger.info(`Connecting to database: ${defaultConfig.host}:${defaultConfig.port}/${defaultConfig.database}`);
    }

    this.pool = new Pool(poolConfig);

    this.pool.on('connect', (client: PoolClient) => {
      logger.info('New client connected to PostgreSQL (User DB)');
    });

    this.pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Initialize users table asynchronously
    this.initialize().catch((error) => {
      logger.warn('User database initialization failed:', error.message);
    });
  }

  private async initialize(): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          is_verified BOOLEAN DEFAULT FALSE,
          verification_token VARCHAR(255),
          reset_password_token VARCHAR(255),
          reset_password_expires TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index on email for faster lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);

      // Create index on verification_token
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
      `);

      // Create index on reset_password_token
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);
      `);

      // Update agents table to add user_id foreign key (if agents table exists)
      try {
        await client.query(`
          ALTER TABLE agents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        `);

        // Create index on user_id in agents table
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
        `);
      } catch (error: any) {
        // Agents table might not exist yet, that's okay
        logger.debug('Agents table not found, skipping user_id foreign key setup');
      }

      client.release();
      logger.info('User database initialized successfully');
    } catch (error: any) {
      logger.warn('Failed to initialize user database (continuing without DB):', error.message);
    }
  }

  private async query<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error: any) {
      throw error;
    }
  }

  async createUser(email: string, hashedPassword: string, verificationToken: string): Promise<User> {
    try {
      const query = `
        INSERT INTO users (email, password, verification_token)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const result = await this.query<User>(query, [email, hashedPassword, verificationToken]);
      return result.rows[0];
    } catch (error: any) {
      logger.error(`Failed to create user ${email}:`, error.message);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const query = `SELECT * FROM users WHERE email = $1`;
      const result = await this.query<User>(query, [email]);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.warn(`Failed to get user ${email} from database:`, error.message);
      return null;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const query = `SELECT * FROM users WHERE id = $1`;
      const result = await this.query<User>(query, [id]);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.warn(`Failed to get user ${id} from database:`, error.message);
      return null;
    }
  }

  async getUserByVerificationToken(token: string): Promise<User | null> {
    try {
      const query = `SELECT * FROM users WHERE verification_token = $1`;
      const result = await this.query<User>(query, [token]);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.warn(`Failed to get user by verification token:`, error.message);
      return null;
    }
  }

  async getUserByResetToken(token: string): Promise<User | null> {
    try {
      const query = `
        SELECT * FROM users 
        WHERE reset_password_token = $1 
        AND reset_password_expires > NOW()
      `;
      const result = await this.query<User>(query, [token]);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.warn(`Failed to get user by reset token:`, error.message);
      return null;
    }
  }

  async verifyUser(token: string): Promise<boolean> {
    try {
      const query = `
        UPDATE users 
        SET is_verified = TRUE, 
            verification_token = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE verification_token = $1
        RETURNING id
      `;
      const result = await this.query(query, [token]);
      return result.rows.length > 0;
    } catch (error: any) {
      logger.error(`Failed to verify user:`, error.message);
      return false;
    }
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<boolean> {
    try {
      const query = `
        UPDATE users 
        SET password = $1,
            reset_password_token = NULL,
            reset_password_expires = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id
      `;
      const result = await this.query(query, [hashedPassword, userId]);
      return result.rows.length > 0;
    } catch (error: any) {
      logger.error(`Failed to update password:`, error.message);
      return false;
    }
  }

  async setResetPasswordToken(email: string, token: string, expiresAt: Date): Promise<boolean> {
    try {
      const query = `
        UPDATE users 
        SET reset_password_token = $1,
            reset_password_expires = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE email = $3
        RETURNING id
      `;
      const result = await this.query(query, [token, expiresAt, email]);
      return result.rows.length > 0;
    } catch (error: any) {
      logger.error(`Failed to set reset password token:`, error.message);
      return false;
    }
  }

  close(): void {
    this.pool.end(() => {
      logger.info('User database connection pool closed');
    });
  }
}

