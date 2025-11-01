import { Router, Request, Response } from 'express';
import { Database } from '../../db/queries';
import { agentManager } from '../../agent-runtime/autonomousAgent';
import logger from '../../utils/logger';
import { API_CONFIG } from '../../utils/constants';

const router = Router();
const database = new Database();

// Middleware to validate agent ID format
const validateAgentId = (req: Request, res: Response, next: any) => {
  const agentId = req.params.id;
  if (!agentId || !/^0x[a-fA-F0-9]{64}$/.test(agentId)) {
    return res.status(400).json({
      error: 'Invalid agent ID format. Must be a 32-byte hex string (0x...)'
    });
  }
  next();
};

/**
 * GET /agents
 * List all agents with basic information
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    // Get agents for this user from database
    try {
      const query = `SELECT * FROM agents WHERE user_id = $1 ORDER BY created_at DESC`;
      const result = await database.query(query, [userId]);
      
      res.json({
        agents: result.rows,
        total: result.rows.length
      });
    } catch (dbError: any) {
      // Fallback to mock data if database unavailable
      logger.warn('Database unavailable, returning mock data');
      const agents = [
        {
          agent_id: '0x6167656e74310000000000000000000000000000000000000000000000000000',
          name: 'Test Agent',
          description: 'Default test agent',
          owner_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          is_active: true,
          user_id: userId
        }
      ];

      res.json({
        agents,
        total: agents.length
      });
    }
  } catch (error) {
    logger.error('Failed to list agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /agents/:id
 * Get detailed information about a specific agent
 */
router.get('/:id', validateAgentId, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;

    let agent;
    try {
      agent = await database.getAgentById(agentId);
    } catch (error) {
      logger.warn('Database not available, using fallback data');
    }

    if (!agent) {
      // Return mock agent data if database unavailable
      agent = {
        agent_id: agentId,
        name: 'Mock Agent',
        description: 'Database not configured',
        owner_address: '0x0000000000000000000000000000000000000000',
        is_active: true
      };
    }

    // Get agent status and activity
    const status = agentManager.getAgentStatus(agentId);
    let recentDecisions = [];
    try {
      recentDecisions = await database.getAgentDecisions(agentId, API_CONFIG.DEFAULT_PAGE_SIZE);
    } catch (error) {
      logger.warn('Could not fetch agent decisions from database');
    }

    res.json({
      agent,
      status,
      recent_activity: recentDecisions
    });
  } catch (error) {
    logger.error(`Failed to get agent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /agents/:id/start
 * Start autonomous agent loop
 */
router.post('/:id/start', validateAgentId, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;
    const { loopIntervalSeconds } = req.body;

    // Validate loop interval if provided
    if (loopIntervalSeconds && (loopIntervalSeconds < 10 || loopIntervalSeconds > 300)) {
      return res.status(400).json({
        error: 'Loop interval must be between 10 and 300 seconds'
      });
    }

    logger.info(`Starting agent ${agentId}`);

    await agentManager.startAgent(agentId);

    // Update loop interval if specified
    if (loopIntervalSeconds) {
      const agent = agentManager.getAgentStatus(agentId);
      if (agent) {
        // Note: This would need to be implemented in the agent manager
        // For now, just log it
        logger.info(`Requested loop interval update to ${loopIntervalSeconds}s for agent ${agentId}`);
      }
    }

    res.json({
      message: `Agent ${agentId} started successfully`,
      agent_id: agentId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to start agent ${req.params.id}:`, error);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /agents/:id/stop
 * Stop autonomous agent loop
 */
router.post('/:id/stop', validateAgentId, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;

    logger.info(`Stopping agent ${agentId}`);

    await agentManager.stopAgent(agentId);

    res.json({
      message: `Agent ${agentId} stopped successfully`,
      agent_id: agentId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to stop agent ${req.params.id}:`, error);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * GET /agents/:id/activity
 * Get recent agent decisions and activity
 */
router.get('/:id/activity', validateAgentId, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;
    const limit = Math.min(
      parseInt(req.query.limit as string) || API_CONFIG.DEFAULT_PAGE_SIZE,
      API_CONFIG.MAX_PAGE_SIZE
    );

    const decisions = await database.getAgentDecisions(agentId, limit);
    const status = agentManager.getAgentStatus(agentId);

    res.json({
      agent_id: agentId,
      status,
      activity: decisions,
      total: decisions.length
    });
  } catch (error) {
    logger.error(`Failed to get activity for agent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /agents/:id/status
 * Get current agent status
 */
router.get('/:id/status', validateAgentId, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;

    const status = agentManager.getAgentStatus(agentId);
    const dbStatus = await database.getAgentStatus(agentId);

    res.json({
      agent_id: agentId,
      runtime_status: status,
      database_status: dbStatus
    });
  } catch (error) {
    logger.error(`Failed to get status for agent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /agents/running
 * Get all currently running agents
 */
router.get('/running', async (req: Request, res: Response) => {
  try {
    const runningAgents = await agentManager.getRunningAgents();

    res.json({
      running_agents: runningAgents,
      total: runningAgents.length
    });
  } catch (error) {
    logger.error('Failed to get running agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /agents/stop-all
 * Stop all running agents (admin endpoint)
 */
router.post('/stop-all', async (req: Request, res: Response) => {
  try {
    logger.info('Stopping all agents via API');

    await agentManager.stopAllAgents();

    res.json({
      message: 'All agents stopped successfully'
    });
  } catch (error) {
    logger.error('Failed to stop all agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /agents/:id/decision
 * Manually trigger a decision for an agent (for testing)
 */
router.post('/:id/decision', validateAgentId, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;

    // Check if agent exists
    const agent = await database.getAgentById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // TODO: Implement decision engine when available
    // For now, return a placeholder response
    res.json({
      agent_id: agentId,
      decision: {
        action: 'no_action',
        reason: 'Decision engine not yet implemented',
        timestamp: new Date().toISOString()
      },
      execution: {
        status: 'skipped',
        message: 'Decision engine not yet implemented'
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to trigger decision for agent ${req.params.id}:`, error);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
