import { Router, Request, Response } from 'express';
import { Database } from '../../db/queries';
import { ethers } from 'ethers';
import logger from '../../utils/logger';
import { API_CONFIG } from '../../utils/constants';

const router = Router();
const database = new Database();

// Middleware to validate intent ID format
const validateIntentId = (req: Request, res: Response, next: any) => {
  const intentId = req.params.id;
  if (!intentId || !/^0x[a-fA-F0-9]{64}$/.test(intentId)) {
    return res.status(400).json({
      error: 'Invalid intent ID format. Must be a 32-byte hex string (0x...)'
    });
  }
  next();
};

// Middleware to validate agent ID format
const validateAgentId = (req: Request, res: Response, next: any) => {
  const agentId = req.params.agentId;
  if (!agentId || !/^0x[a-fA-F0-9]{64}$/.test(agentId)) {
    return res.status(400).json({
      error: 'Invalid agent ID format. Must be a 32-byte hex string (0x...)'
    });
  }
  next();
};

/**
 * GET /intents
 * Get all intents with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      agentId,
      status,
      chainId,
      page = 1,
      limit = API_CONFIG.DEFAULT_PAGE_SIZE
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const safeLimit = Math.min(Number(limit), API_CONFIG.MAX_PAGE_SIZE);

    let query = `
      SELECT i.*, a.name as agent_name, a.owner_address
      FROM intents i
      LEFT JOIN agents a ON i.agent_id = a.agent_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Add filters
    if (agentId) {
      query += ` AND i.agent_id = $${params.length + 1}`;
      params.push(agentId);
    }

    if (status) {
      query += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }

    if (chainId) {
      query += ` AND (i.src_chain_id = $${params.length + 1} OR i.dest_chain_id = $${params.length + 1})`;
      params.push(chainId);
    }

    // If user is authenticated, only show their agents' intents
    if (userId) {
      query += ` AND a.user_id = $${params.length + 1}`;
      params.push(userId);
    }

    // Add ordering and pagination
    query += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(safeLimit, offset);

    const result = await database.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM intents i
      LEFT JOIN agents a ON i.agent_id = a.agent_id
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (agentId) {
      countQuery += ` AND i.agent_id = $${countParams.length + 1}`;
      countParams.push(agentId);
    }

    if (status) {
      countQuery += ` AND i.status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    if (chainId) {
      countQuery += ` AND (i.src_chain_id = $${countParams.length + 1} OR i.dest_chain_id = $${countParams.length + 1})`;
      countParams.push(chainId);
    }

    if (userId) {
      countQuery += ` AND a.user_id = $${countParams.length + 1}`;
      countParams.push(userId);
    }

    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      intents: result.rows,
      pagination: {
        page: Number(page),
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    logger.error('Failed to get intents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /intents/:id
 * Get detailed information about a specific intent
 */
router.get('/:id', validateIntentId, async (req: Request, res: Response) => {
  try {
    const { id: intentId } = req.params;
    const userId = (req as any).user?.userId;

    // Get intent with agent information
    let query = `
      SELECT i.*, a.name as agent_name, a.owner_address, a.user_id
      FROM intents i
      LEFT JOIN agents a ON i.agent_id = a.agent_id
      WHERE i.intent_id = $1
    `;
    const params = [intentId];

    const result = await database.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intent not found' });
    }

    const intent = result.rows[0];

    // Check if user has access to this intent
    if (userId && intent.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get timeline events (mock for now)
    const timeline = [
      {
        event: 'created',
        timestamp: intent.created_at,
        data: { status: 'pending' }
      }
    ];

    if (intent.submitted_at) {
      timeline.push({
        event: 'submitted',
        timestamp: intent.submitted_at,
        data: { relayer: intent.relayer_address }
      });
    }

    if (intent.executed_at) {
      timeline.push({
        event: 'executed',
        timestamp: intent.executed_at,
        data: intent.execution_data || {}
      });
    }

    res.json({
      intent: {
        ...intent,
        timeline
      }
    });
  } catch (error) {
    logger.error(`Failed to get intent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /intents
 * Create a new cross-chain intent
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      agentId,
      srcChainId,
      destChainId,
      action,
      params,
      expiry,
      signature
    } = req.body;

    // Validate required fields
    if (!agentId || !srcChainId || !destChainId || !action || !params) {
      return res.status(400).json({
        error: 'Missing required fields: agentId, srcChainId, destChainId, action, params'
      });
    }

    // Validate agent ownership
    const agentQuery = `SELECT * FROM agents WHERE agent_id = $1 AND user_id = $2`;
    const agentResult = await database.query(agentQuery, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(403).json({ error: 'Agent not found or access denied' });
    }

    const agent = agentResult.rows[0];
    if (!agent.is_active) {
      return res.status(400).json({ error: 'Agent is not active' });
    }

    // Generate intent ID
    const intentId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'uint256', 'uint256', 'string', 'uint256'],
        [agentId, srcChainId, destChainId, action, Date.now()]
      )
    );

    // Get current nonce for agent
    const nonceQuery = `SELECT COUNT(*) as nonce FROM intents WHERE agent_id = $1`;
    const nonceResult = await database.query(nonceQuery, [agentId]);
    const nonce = parseInt(nonceResult.rows[0].nonce);

    // Set default expiry if not provided (24 hours from now)
    const defaultExpiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    const finalExpiry = expiry || defaultExpiry;

    // Create intent record
    const insertQuery = `
      INSERT INTO intents (
        intent_id, agent_id, src_chain_id, dest_chain_id,
        action_hash, nonce, expiry, value, recipient,
        status, signature, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;

    const actionHash = ethers.keccak256(ethers.toUtf8Bytes(action));
    const intentParams = [
      intentId,
      agentId,
      srcChainId,
      destChainId,
      actionHash,
      nonce,
      new Date(finalExpiry * 1000),
      params.amount || '0',
      params.to || params.recipient || ethers.ZeroAddress,
      'pending',
      signature || null
    ];

    const result = await database.query(insertQuery, intentParams);

    logger.info(`Created intent ${intentId} for agent ${agentId}`);

    res.status(201).json({
      intent: result.rows[0],
      message: 'Intent created successfully'
    });
  } catch (error) {
    logger.error('Failed to create intent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /intents/:id/submit
 * Submit intent for execution (relayer endpoint)
 */
router.post('/:id/submit', validateIntentId, async (req: Request, res: Response) => {
  try {
    const { id: intentId } = req.params;
    const { relayerAddress } = req.body;

    if (!relayerAddress || !ethers.isAddress(relayerAddress)) {
      return res.status(400).json({ error: 'Valid relayer address required' });
    }

    // Update intent status
    const updateQuery = `
      UPDATE intents
      SET status = 'submitted', relayer_address = $1, submitted_at = NOW()
      WHERE intent_id = $2 AND status = 'pending'
      RETURNING *
    `;

    const result = await database.query(updateQuery, [relayerAddress, intentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intent not found or already submitted' });
    }

    logger.info(`Intent ${intentId} submitted by relayer ${relayerAddress}`);

    res.json({
      intent: result.rows[0],
      message: 'Intent submitted for execution'
    });
  } catch (error) {
    logger.error(`Failed to submit intent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /intents/:id/execute
 * Execute intent (relayer endpoint)
 */
router.post('/:id/execute', validateIntentId, async (req: Request, res: Response) => {
  try {
    const { id: intentId } = req.params;
    const { txHash, executionData } = req.body;

    // Update intent status to executed
    const updateQuery = `
      UPDATE intents
      SET status = 'executed', executed_at = NOW(), execution_data = $1
      WHERE intent_id = $2 AND status = 'submitted'
      RETURNING *
    `;

    const result = await database.query(updateQuery, [executionData || {}, intentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intent not found or not ready for execution' });
    }

    logger.info(`Intent ${intentId} executed with tx ${txHash || 'unknown'}`);

    res.json({
      intent: result.rows[0],
      message: 'Intent executed successfully'
    });
  } catch (error) {
    logger.error(`Failed to execute intent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /intents/agent/:agentId
 * Get all intents for a specific agent
 */
router.get('/agent/:agentId', validateAgentId, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const userId = (req as any).user?.userId;
    const { page = 1, limit = API_CONFIG.DEFAULT_PAGE_SIZE } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const safeLimit = Math.min(Number(limit), API_CONFIG.MAX_PAGE_SIZE);

    // Check agent ownership
    const agentQuery = `SELECT * FROM agents WHERE agent_id = $1`;
    const agentResult = await database.query(agentQuery, [agentId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Check access permissions
    if (userId && agent.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get intents for agent
    const intentsQuery = `
      SELECT * FROM intents
      WHERE agent_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const intentsResult = await database.query(intentsQuery, [agentId, safeLimit, offset]);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM intents WHERE agent_id = $1`;
    const countResult = await database.query(countQuery, [agentId]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      agent: {
        agent_id: agentId,
        name: agent.name
      },
      intents: intentsResult.rows,
      pagination: {
        page: Number(page),
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    logger.error(`Failed to get intents for agent ${req.params.agentId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /intents/:id/dispute
 * Dispute an intent (watchdog function)
 */
router.post('/:id/dispute', validateIntentId, async (req: Request, res: Response) => {
  try {
    const { id: intentId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Dispute reason required' });
    }

    // Update intent status to disputed
    const updateQuery = `
      UPDATE intents
      SET status = 'disputed', dispute_reason = $1, disputed_at = NOW()
      WHERE intent_id = $2 AND status IN ('submitted', 'executed')
      RETURNING *
    `;

    const result = await database.query(updateQuery, [reason, intentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intent not found or cannot be disputed' });
    }

    logger.warn(`Intent ${intentId} disputed: ${reason}`);

    res.json({
      intent: result.rows[0],
      message: 'Intent disputed successfully'
    });
  } catch (error) {
    logger.error(`Failed to dispute intent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
