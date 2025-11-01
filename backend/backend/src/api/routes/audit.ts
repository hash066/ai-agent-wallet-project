import { Router, Request, Response } from 'express';
import { Database } from '../../db/queries';
import logger from '../../utils/logger';

const router = Router();
const database = new Database();

/**
 * GET /audit/decisions
 * Get agent decision history
 */
router.get('/decisions', async (req: Request, res: Response) => {
  try {
    const { agentId, limit = 50, offset = 0 } = req.query;

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'agentId parameter is required' });
    }

    const decisions = await database.getAgentDecisions(
      agentId,
      parseInt(limit as string)
    );

    res.json({
      agent_id: agentId,
      decisions,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: decisions.length
      }
    });
  } catch (error) {
    logger.error('Failed to get agent decisions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /audit/agents/:agentId/status
 * Get agent status and statistics
 */
router.get('/agents/:agentId/status', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const status = await database.getAgentStatus(agentId);
    const decisions = await database.getAgentDecisions(agentId, 1000);

    const stats = {
      total_decisions: decisions.length,
      successful_decisions: decisions.filter(d => d.success).length,
      failed_decisions: decisions.filter(d => !d.success).length,
      last_decision_time: decisions.length > 0 ? decisions[0].created_at : null
    };

    res.json({
      agent_id: agentId,
      status,
      statistics: stats
    });
  } catch (error) {
    logger.error(`Failed to get agent status for ${req.params.agentId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



export { router as auditRouter };
