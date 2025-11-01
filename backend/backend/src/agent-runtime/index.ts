// AI Agent Runtime - Main exports
// Autonomous agent functionality for AI Agent Wallet

export {
  AgentManager,
  agentManager,
  type AgentStatus
} from './autonomousAgent';

// Export other existing modules
export * from './commitmentGenerator';
export * from './delegationVerifier';
export * from './eip712Signer';
export * from './policyEngine';

// Note: OracleClient and DecisionEngine are not yet implemented
// They can be added when needed
