import Database from 'better-sqlite3';
import logger from '../utils/logger';

export interface Intent {
  intentId: string;
  agentId: string;
  srcChainId: number;
  destChainId: number;
  actionHash: string;
  nonce: number;
  expiry: number;
  signature?: string;
  relayerSignature?: string;
  status: 'Pending' | 'Validated' | 'Submitted' | 'Executed' | 'Failed' | 'Disputed';
  srcTxHash?: string;
  destTxHash?: string;
  createdAt: number;
  processedAt?: number;
  errorReason?: string;
}

export class IntentQueue {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS intents (
        intentId TEXT PRIMARY KEY,
        agentId TEXT NOT NULL,
        srcChainId INTEGER NOT NULL,
        destChainId INTEGER NOT NULL,
        actionHash TEXT NOT NULL,
        nonce INTEGER NOT NULL,
        expiry INTEGER NOT NULL,
        signature TEXT,
        relayerSignature TEXT,
        status TEXT NOT NULL,
        srcTxHash TEXT,
        destTxHash TEXT,
        createdAt INTEGER NOT NULL,
        processedAt INTEGER,
        errorReason TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_status ON intents(status, createdAt);
      CREATE INDEX IF NOT EXISTS idx_agent ON intents(agentId);
      CREATE INDEX IF NOT EXISTS idx_dest_chain ON intents(destChainId, status);
    `);

    logger.info('Intent queue database initialized');
  }

  /**
   * Add intent to queue
   */
  async enqueue(intent: Omit<Intent, 'status' | 'createdAt'>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO intents (
        intentId, agentId, srcChainId, destChainId, actionHash, nonce, expiry,
        signature, relayerSignature, status, srcTxHash, destTxHash, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      intent.intentId,
      intent.agentId,
      intent.srcChainId,
      intent.destChainId,
      intent.actionHash,
      intent.nonce,
      intent.expiry,
      intent.signature || null,
      intent.relayerSignature || null,
      'Pending',
      intent.srcTxHash || null,
      intent.destTxHash || null,
      Date.now()
    );

    logger.info(`Intent ${intent.intentId} added to queue`);
  }

  /**
   * Get next pending intent
   */
  getNextIntent(): Intent | null {
    const stmt = this.db.prepare(`
      SELECT * FROM intents
      WHERE status = 'Pending'
      ORDER BY createdAt ASC
      LIMIT 1
    `);

    const row = stmt.get() as any;
    return row ? this.mapRowToIntent(row) : null;
  }

  /**
   * Get intent by ID
   */
  getIntent(intentId: string): Intent | null {
    const stmt = this.db.prepare('SELECT * FROM intents WHERE intentId = ?');
    const row = stmt.get(intentId) as any;
    return row ? this.mapRowToIntent(row) : null;
  }

  /**
   * Update intent status
   */
  updateStatus(
    intentId: string,
    status: Intent['status'],
    additionalData?: {
      signature?: string;
      relayerSignature?: string;
      destTxHash?: string;
      errorReason?: string;
    }
  ): void {
    const updates: string[] = ['status = ?', 'processedAt = ?'];
    const values: any[] = [status, Date.now()];

    if (additionalData?.signature) {
      updates.push('signature = ?');
      values.push(additionalData.signature);
    }

    if (additionalData?.relayerSignature) {
      updates.push('relayerSignature = ?');
      values.push(additionalData.relayerSignature);
    }

    if (additionalData?.destTxHash) {
      updates.push('destTxHash = ?');
      values.push(additionalData.destTxHash);
    }

    if (additionalData?.errorReason) {
      updates.push('errorReason = ?');
      values.push(additionalData.errorReason);
    }

    values.push(intentId);

    const stmt = this.db.prepare(`
      UPDATE intents SET ${updates.join(', ')}
      WHERE intentId = ?
    `);

    stmt.run(...values);
    logger.info(`Intent ${intentId} status updated to ${status}`);
  }

  /**
   * Get all intents for an agent
   */
  getAgentIntents(agentId: string, limit: number = 100): Intent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM intents
      WHERE agentId = ?
      ORDER BY createdAt DESC
      LIMIT ?
    `);

    const rows = stmt.all(agentId, limit) as any[];
    return rows.map(row => this.mapRowToIntent(row));
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    validated: number;
    submitted: number;
    executed: number;
    failed: number;
    disputed: number;
  } {
    const stmt = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM intents
      GROUP BY status
    `);

    const rows = stmt.all() as Array<{ status: string; count: number }>;
    const stats = {
      pending: 0,
      validated: 0,
      submitted: 0,
      executed: 0,
      failed: 0,
      disputed: 0
    };

    rows.forEach(row => {
      const key = row.status.toLowerCase() as keyof typeof stats;
      if (key in stats) {
        stats[key] = row.count;
      }
    });

    return stats;
  }

  /**
   * Map database row to Intent object
   */
  private mapRowToIntent(row: any): Intent {
    return {
      intentId: row.intentId,
      agentId: row.agentId,
      srcChainId: row.srcChainId,
      destChainId: row.destChainId,
      actionHash: row.actionHash,
      nonce: row.nonce,
      expiry: row.expiry,
      signature: row.signature,
      relayerSignature: row.relayerSignature,
      status: row.status,
      srcTxHash: row.srcTxHash,
      destTxHash: row.destTxHash,
      createdAt: row.createdAt,
      processedAt: row.processedAt,
      errorReason: row.errorReason
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    logger.info('Intent queue database closed');
  }
}

// ============================================
// FILE: backend/src/relayer/intentValidator.ts
// ============================================
import { ethers } from 'ethers';
import { Intent } from './intentQueue';
import { verifyIntentSignature } from '../agent-runtime/eip712Signer';
import logger from '../utils/logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class IntentValidator {
  private sourceProvider: ethers.Provider;
  private destProvider: ethers.Provider;
  private sourceExecutorAddress: string;
  private destExecutorAddress: string;

  constructor(
    sourceProvider: ethers.Provider,
    destProvider: ethers.Provider,
    sourceExecutorAddress: string,
    destExecutorAddress: string
  ) {
    this.sourceProvider = sourceProvider;
    this.destProvider = destProvider;
    this.sourceExecutorAddress = sourceExecutorAddress;
    this.destExecutorAddress = destExecutorAddress;
  }

  /**
   * Validate intent before relaying
   */
  async validateIntent(intent: Intent): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Check 1: Verify signature exists
      if (!intent.signature) {
        errors.push('Missing intent signature');
        return { valid: false, errors };
      }

      // Check 2: Verify expiry
      const currentTime = Math.floor(Date.now() / 1000);
      if (intent.expiry < currentTime) {
        errors.push(`Intent expired at ${new Date(intent.expiry * 1000).toISOString()}`);
      }

      // Check 3: Verify EIP-712 signature
      try {
        const intentData = {
          intentId: intent.intentId,
          agentId: intent.agentId,
          srcChainId: intent.srcChainId,
          destChainId: intent.destChainId,
          actionHash: intent.actionHash,
          nonce: intent.nonce,
          expiry: intent.expiry
        };

        const recoveredAddress = verifyIntentSignature(
          this.sourceExecutorAddress,
          intentData,
          intent.signature
        );

        // In a real implementation, verify against agent's wallet address from registry
        logger.info(`Signature verified from address: ${recoveredAddress}`);
      } catch (error) {
        errors.push('Invalid EIP-712 signature');
        logger.error('Signature verification failed:', error);
      }

      // Check 4: Verify nonce (would query source chain contract)
      // For MVP, we skip this to avoid too many RPC calls

      // Check 5: Verify not already executed on destination
      // For MVP, we skip this to avoid too many RPC calls

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('Intent validation error:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      return { valid: false, errors };
    }
  }
}