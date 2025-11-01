-- AI Agent Wallet Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(66) UNIQUE NOT NULL, -- bytes32 as hex string
    owner_address VARCHAR(42) NOT NULL, -- Ethereum address
    name VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intents table
CREATE TABLE intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_id VARCHAR(66) UNIQUE NOT NULL, -- bytes32 as hex string
    agent_id VARCHAR(66) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    src_chain_id BIGINT NOT NULL,
    dest_chain_id BIGINT NOT NULL,
    action_hash VARCHAR(66) NOT NULL, -- bytes32 as hex string
    nonce BIGINT NOT NULL,
    expiry TIMESTAMP WITH TIME ZONE NOT NULL,
    value VARCHAR(78), -- uint256 as string to handle large numbers
    recipient VARCHAR(42) NOT NULL, -- Ethereum address
    relayer_address VARCHAR(42), -- Ethereum address
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'submitted', 'executed', 'disputed', 'failed')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    disputed_at TIMESTAMP WITH TIME ZONE,
    dispute_reason TEXT,
    execution_data JSONB DEFAULT '{}',
    signature VARCHAR(132), -- EIP-712 signature as hex string
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure nonce uniqueness per agent
    UNIQUE(agent_id, nonce)
);

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(66) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    commitment_hash VARCHAR(66) NOT NULL, -- bytes32 as hex string
    ipfs_cid VARCHAR(255) NOT NULL,
    submitter_address VARCHAR(42) NOT NULL, -- Ethereum address
    event_type VARCHAR(50) NOT NULL, -- 'commitment', 'intent_emitted', 'intent_executed', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Index for efficient queries
    INDEX idx_audit_agent_created (agent_id, created_at),
    INDEX idx_audit_commitment (commitment_hash)
);

-- Policies table
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id VARCHAR(66) UNIQUE NOT NULL, -- bytes32 as hex string
    agent_id VARCHAR(66) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    policy_type VARCHAR(50) NOT NULL, -- 'spending_limit', 'time_restriction', 'contract_whitelist', etc.
    conditions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relayers table
CREATE TABLE relayers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address
    name VARCHAR(255),
    endpoint_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    reputation_score DECIMAL(5,2) DEFAULT 5.00,
    total_intents_processed BIGINT DEFAULT 0,
    successful_executions BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intent-Relayer assignments
CREATE TABLE intent_relayers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_id VARCHAR(66) NOT NULL REFERENCES intents(intent_id) ON DELETE CASCADE,
    relayer_address VARCHAR(42) NOT NULL REFERENCES relayers(address) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed')),

    UNIQUE(intent_id, relayer_address)
);

-- Metrics and monitoring
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL, -- 'intent_created', 'intent_executed', 'gas_used', etc.
    agent_id VARCHAR(66),
    intent_id VARCHAR(66),
    chain_id BIGINT,
    value DECIMAL(36,18), -- For large numbers like gas or token amounts
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes for efficient queries
    INDEX idx_metrics_type_time (metric_type, recorded_at),
    INDEX idx_metrics_agent (agent_id, recorded_at)
);

-- API keys for authentication
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash VARCHAR(128) UNIQUE NOT NULL, -- SHA-256 hash of the API key
    name VARCHAR(255) NOT NULL,
    agent_id VARCHAR(66) REFERENCES agents(agent_id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '["read"]', -- Array of permissions
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions for rate limiting
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(128) UNIQUE NOT NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Agent autonomous status tracking
CREATE TABLE agent_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(66) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    is_running BOOLEAN DEFAULT false,
    last_started_at TIMESTAMP WITH TIME ZONE,
    last_stopped_at TIMESTAMP WITH TIME ZONE,
    loop_interval_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(agent_id)
);

-- Agent decision history
CREATE TABLE agent_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(66) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    decision_type VARCHAR(50) NOT NULL, -- 'oracle_request', 'transaction_execution', 'skip_action', etc.
    reasoning TEXT NOT NULL,
    conditions JSONB DEFAULT '{}', -- Rule conditions that were evaluated
    action_taken JSONB DEFAULT '{}', -- What action was taken (if any)
    oracle_data JSONB DEFAULT '{}', -- Oracle data used in decision
    transaction_hash VARCHAR(66), -- If a transaction was executed
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting counters
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- IP, API key, or agent ID
    limit_type VARCHAR(50) NOT NULL, -- 'requests_per_minute', 'intents_per_hour', etc.
    current_count INTEGER DEFAULT 0,
    reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(identifier, limit_type)
);

-- Create indexes for performance
CREATE INDEX idx_intents_agent_status ON intents(agent_id, status);
CREATE INDEX idx_intents_status_created ON intents(status, created_at);
CREATE INDEX idx_intents_expiry ON intents(expiry) WHERE status = 'pending';
CREATE INDEX idx_policies_agent_active ON policies(agent_id, is_active);
CREATE INDEX idx_relayers_active_score ON relayers(is_active, reputation_score DESC);
CREATE INDEX idx_api_keys_active_expires ON api_keys(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_rate_limits_reset ON rate_limits(reset_time);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intents_updated_at BEFORE UPDATE ON intents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_relayers_updated_at BEFORE UPDATE ON relayers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
INSERT INTO relayers (address, name, endpoint_url) VALUES
('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'Default Relayer', 'http://localhost:3001');

-- Create a default agent for testing
INSERT INTO agents (agent_id, owner_address, name, description) VALUES
('0x6167656e74310000000000000000000000000000000000000000000000000000', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'Test Agent', 'Default test agent');
