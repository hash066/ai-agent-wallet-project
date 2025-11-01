/**
 * Autonomous Agent Manager
 * Manages the lifecycle of AI agents
 */

import logger from '../utils/logger';

interface AgentStatus {
  agentId: string;
  isRunning: boolean;
  startedAt?: Date;
  lastDecisionAt?: Date;
  loopInterval?: number;
}

class AgentManager {
  private agents: Map<string, AgentStatus> = new Map();

  /**
   * Get status of an agent
   */
  getAgentStatus(agentId: string): AgentStatus | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * Start an agent
   */
  async startAgent(agentId: string): Promise<void> {
    logger.info(`Starting agent ${agentId}`);
    
    const status: AgentStatus = {
      agentId,
      isRunning: true,
      startedAt: new Date(),
    };
    
    this.agents.set(agentId, status);
    
    // TODO: Implement actual agent loop
    logger.info(`Agent ${agentId} started (stub implementation)`);
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<void> {
    logger.info(`Stopping agent ${agentId}`);
    
    const status = this.agents.get(agentId);
    if (status) {
      status.isRunning = false;
      this.agents.set(agentId, status);
    }
    
    logger.info(`Agent ${agentId} stopped`);
  }

  /**
   * Get all running agents
   */
  async getRunningAgents(): Promise<AgentStatus[]> {
    return Array.from(this.agents.values()).filter(agent => agent.isRunning);
  }

  /**
   * Stop all running agents
   */
  async stopAllAgents(): Promise<void> {
    logger.info('Stopping all agents');
    
    for (const [agentId, status] of this.agents.entries()) {
      if (status.isRunning) {
        await this.stopAgent(agentId);
      }
    }
    
    logger.info('All agents stopped');
  }
}

export const agentManager = new AgentManager();

