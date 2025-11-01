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

export class Database {
  private pool: Pool;

  constructor(config?: DatabaseConfig) {
    // Support Supabase connection string (DATABASE_URL)
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
      logger.info('New client connected to PostgreSQL');
    });

    this.pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Initialize database asynchronously (non-blocking)
    this.initialize().catch((error) => {
      logger.warn('Database initialization failed, server will continue without database:', error.message);
    });
  }

  private async initialize(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      logger.info('Connected to PostgreSQL database');

      // Check if tables exist, if not create them
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'agents'
        );
      `);

      if (!result.rows[0].exists) {
        logger.info('Initializing database schema...');
        // Schema will be initialized by Docker init script
        // But we can add manual initialization here if needed
      }

      client.release();
      logger.info('Database initialized successfully');
    } catch (error: any) {
      logger.warn('Failed to initialize database (continuing without DB):', error.message);
      // Don't throw - allow server to start without database
      // Individual queries will handle errors gracefully
    }
  }

  async query<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error: any) {
      // Re-throw so calling code can handle it
      throw error;
    }
  }

  private async _query<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return this.query(sql, params);
  }

  async enqueueIntent(intent: any): Promise<void> {
    const query = `
      INSERT INTO intents (
        intent_id, agent_id, src_chain_id, dest_chain_id,
        action_hash, nonce, signature, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await this.query(query, [
      intent.intentId,
      intent.agentId,
      intent.srcChainId,
      intent.destChainId,
      intent.actionHash,
      intent.nonce,
      intent.signature,
      'pending',
      new Date()
    ]);

    logger.info(`Intent enqueued: ${intent.intentId}`);
  }

  async getNextIntent(): Promise<any | null> {
    const query = `
      SELECT * FROM intents
      WHERE status IN ('pending', 'validated', 'submitted')
      ORDER BY created_at ASC LIMIT 1
    `;

    const result = await this.query(query);
    return result.rows[0] || null;
  }

  async markProcessed(intentId: string, txHash: string): Promise<void> {
    const query = `
      UPDATE intents
      SET status = 'executed', execution_data = $2, executed_at = $3
      WHERE intent_id = $1
    `;

    await this.query(query, [intentId, JSON.stringify({ txHash }), new Date()]);
    logger.info(`Intent marked as executed: ${intentId}`);
  }

  async markFailed(intentId: string, reason: string): Promise<void> {
    const query = `
      UPDATE intents
      SET status = 'failed', dispute_reason = $2, disputed_at = $3
      WHERE intent_id = $1
    `;

    await this.query(query, [intentId, reason, new Date()]);
    logger.error(`Intent marked as failed: ${intentId} - ${reason}`);
  }

  async updateIntentStatus(intentId: string, status: string, relayerAddress?: string): Promise<void> {
    let query: string;
    let params: any[];

    if (relayerAddress) {
      query = `
        UPDATE intents
        SET status = $1, relayer_address = $2, submitted_at = $3
        WHERE intent_id = $4
      `;
      params = [status, relayerAddress, new Date(), intentId];
    } else {
      query = `UPDATE intents SET status = $1 WHERE intent_id = $2`;
      params = [status, intentId];
    }

    await this.query(query, params);
    logger.info(`Intent status updated: ${intentId} -> ${status}`);
  }

  async getIntentById(intentId: string): Promise<any | null> {
    const query = `SELECT * FROM intents WHERE intent_id = $1`;
    const result = await this.query(query, [intentId]);
    return result.rows[0] || null;
  }

  async getAllPendingIntents(): Promise<any[]> {
    const query = `
      SELECT * FROM intents
      WHERE status IN ('pending', 'validated', 'submitted')
      ORDER BY created_at ASC
    `;
    const result = await this.query(query);
    return result.rows;
  }

  async saveLastProcessed(blockNumber: number, chainId: number): Promise<void> {
    const query = `
      INSERT INTO metrics (metric_type, chain_id, value, recorded_at)
      VALUES ('last_processed_block', $1, $2, $3)
      ON CONFLICT (metric_type, chain_id)
      DO UPDATE SET value = EXCLUDED.value, recorded_at = EXCLUDED.recorded_at
    `;

    await this.query(query, [chainId, blockNumber.toString(), new Date()]);
  }

  async getLastProcessed(chainId: number): Promise<number> {
    const query = `
      SELECT value FROM metrics
      WHERE metric_type = 'last_processed_block' AND chain_id = $1
      ORDER BY recorded_at DESC LIMIT 1
    `;

    const result = await this.query(query, [chainId]);
    return result.rows[0] ? parseInt(result.rows[0].value) : 0;
  }

  // Additional methods for the AI Agent Wallet system
  async createAgent(agentData: any): Promise<string> {
    const query = `
      INSERT INTO agents (agent_id, owner_address, name, description, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const result = await this.query(query, [
      agentData.agentId,
      agentData.ownerAddress,
      agentData.name,
      agentData.description,
      JSON.stringify(agentData.metadata || {})
    ]);

    return result.rows[0].id;
  }

  async getAgentById(agentId: string): Promise<any | null> {
    try {
      const query = `SELECT * FROM agents WHERE agent_id = $1`;
      const result = await this.query(query, [agentId]);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.warn(`Failed to get agent ${agentId} from database:`, error.message);
      return null;
    }
  }

  async logAuditEvent(agentId: string, eventType: string, commitmentHash?: string, ipfsCid?: string, metadata?: any): Promise<void> {
    const query = `
      INSERT INTO audit_log (agent_id, commitment_hash, ipfs_cid, event_type, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `;

    await this.query(query, [
      agentId,
      commitmentHash || null,
      ipfsCid || null,
      eventType,
      JSON.stringify(metadata || {})
    ]);
  }

  async getAgentAuditTrail(agentId: string, limit: number = 100): Promise<any[]> {
    const query = `
      SELECT * FROM audit_log
      WHERE agent_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.query(query, [agentId, limit]);
    return result.rows;
  }

  async recordMetric(metricType: string, agentId?: string, intentId?: string, chainId?: number, value?: string, metadata?: any): Promise<void> {
    const query = `
      INSERT INTO metrics (metric_type, agent_id, intent_id, chain_id, value, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.query(query, [
      metricType,
      agentId || null,
      intentId || null,
      chainId || null,
      value || null,
      JSON.stringify(metadata || {})
    ]);
  }

  // Agent autonomy methods
  async getAgentStatus(agentId: string): Promise<any | null> {
    try {
      const query = `SELECT * FROM agent_status WHERE agent_id = $1`;
      const result = await this.query(query, [agentId]);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.warn(`Failed to get agent status ${agentId} from database:`, error.message);
      return null;
    }
  }

  async startAgent(agentId: string, loopIntervalSeconds: number = 30): Promise<void> {
    const query = `
      INSERT INTO agent_status (agent_id, is_running, last_started_at, loop_interval_seconds)
      VALUES ($1, true, $2, $3)
      ON CONFLICT (agent_id)
      DO UPDATE SET
        is_running = true,
        last_started_at = $2,
        loop_interval_seconds = $3,
        updated_at = NOW()
    `;

    await this.query(query, [agentId, new Date(), loopIntervalSeconds]);
    logger.info(`Agent ${agentId} started with ${loopIntervalSeconds}s interval`);
  }

  async stopAgent(agentId: string): Promise<void> {
    const query = `
      UPDATE agent_status
      SET is_running = false, last_stopped_at = $2, updated_at = NOW()
      WHERE agent_id = $1
    `;

    await this.query(query, [agentId, new Date()]);
    logger.info(`Agent ${agentId} stopped`);
  }

  async getRunningAgents(): Promise<any[]> {
    const query = `
      SELECT as.*, a.name, a.owner_address
      FROM agent_status as_
      JOIN agents a ON as_.agent_id = a.agent_id
      WHERE as_.is_running = true
    `;
    const result = await this.query(query);
    return result.rows;
  }

  async logAgentDecision(agentId: string, decisionType: string, reasoning: string, conditions?: any, actionTaken?: any, oracleData?: any, transactionHash?: string, success: boolean = true, errorMessage?: string): Promise<void> {
    const query = `
      INSERT INTO agent_decisions (agent_id, decision_type, reasoning, conditions, action_taken, oracle_data, transaction_hash, success, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await this.query(query, [
      agentId,
      decisionType,
      reasoning,
      JSON.stringify(conditions || {}),
      JSON.stringify(actionTaken || {}),
      JSON.stringify(oracleData || {}),
      transactionHash || null,
      success,
      errorMessage || null
    ]);
  }

  async getAgentDecisions(agentId: string, limit: number = 50): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM agent_decisions
        WHERE agent_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.query(query, [agentId, limit]);
      return result.rows;
    } catch (error: any) {
      logger.warn(`Failed to get agent decisions ${agentId} from database:`, error.message);
      return [];
    }
  }

  async getAgentTransactionCountLastHour(agentId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as tx_count
      FROM agent_decisions
      WHERE agent_id = $1
        AND decision_type = 'transaction_execution'
        AND success = true
        AND created_at >= NOW() - INTERVAL '1 hour'
    `;

    const result = await this.query(query, [agentId]);
    return parseInt(result.rows[0].tx_count) || 0;
  }

  close(): void {
    this.pool.end(() => {
      logger.info('Database connection pool closed');
    });
  }
}
