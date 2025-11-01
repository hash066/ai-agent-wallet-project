pragma solidity ^0.8.19;

// SPDX-License-Identifier: MIT

/**
 * @title AgentRegistry
 * @notice Single source of truth for agent identities with canonical wallet binding
 * @dev Implements secure agent registration, ownership validation, and policy management
 */
contract AgentRegistry {
    struct Agent {
        address owner;           // Owner who can update agent
        address wallet;          // Agent's signing wallet (immutable after registration)
        bytes publicKey;         // Agent's public key for verification
        string metadataCID;      // IPFS CID for agent metadata
        bool active;             // Agent status
        uint256 registeredAt;    // Registration timestamp
    }

    struct PolicyConfig {
        uint256 maxSpendPerDay;      // Wei limit per 24h
        uint256 maxTxPerHour;        // Transaction count limit per hour
        uint256 maxValuePerTx;       // Wei limit per transaction
        address[] whitelistedAddresses; // Allowed recipient addresses
    }

    // State variables
    mapping(bytes32 => Agent) public agents;
    mapping(bytes32 => PolicyConfig) public policies;
    mapping(address => bytes32) public walletToAgentId; // Reverse lookup

    // Events
    event AgentRegistered(
        bytes32 indexed agentId,
        address indexed owner,
        address indexed wallet,
        string metadataCID
    );
    
    event AgentUpdated(bytes32 indexed agentId, string newMetadataCID);
    event AgentDeactivated(bytes32 indexed agentId);
    event AgentReactivated(bytes32 indexed agentId);
    event PolicyUpdated(bytes32 indexed agentId, PolicyConfig policy);

    // Errors
    error AgentAlreadyExists();
    error AgentNotFound();
    error AgentInactive();
    error UnauthorizedCaller();
    error InvalidWalletAddress();
    error WalletAlreadyBound();

    /**
     * @notice Validates caller is the agent's registered wallet
     * @param agentId The agent identifier
     */
    modifier onlyAgentWallet(bytes32 agentId) {
        Agent memory agent = agents[agentId];
        if (agent.wallet == address(0)) revert AgentNotFound();
        if (msg.sender != agent.wallet) revert UnauthorizedCaller();
        if (!agent.active) revert AgentInactive();
        _;
    }

    /**
     * @notice Validates caller is the agent's owner
     * @param agentId The agent identifier
     */
    modifier onlyOwner(bytes32 agentId) {
        Agent memory agent = agents[agentId];
        if (agent.owner == address(0)) revert AgentNotFound();
        if (msg.sender != agent.owner) revert UnauthorizedCaller();
        _;
    }

    /**
     * @notice Register a new agent with wallet binding
     * @param agentId Unique identifier for the agent
     * @param wallet Agent's signing wallet address
     * @param publicKey Agent's public key
     * @param metadataCID IPFS CID for agent metadata
     * @param policy Initial policy configuration
     */
    function registerAgent(
        bytes32 agentId,
        address wallet,
        bytes calldata publicKey,
        string calldata metadataCID,
        PolicyConfig calldata policy
    ) external {
        // Validation
        if (agents[agentId].wallet != address(0)) revert AgentAlreadyExists();
        if (wallet == address(0)) revert InvalidWalletAddress();
        if (walletToAgentId[wallet] != bytes32(0)) revert WalletAlreadyBound();

        // Store agent
        agents[agentId] = Agent({
            owner: msg.sender,
            wallet: wallet,
            publicKey: publicKey,
            metadataCID: metadataCID,
            active: true,
            registeredAt: block.timestamp
        });

        // Store policy
        policies[agentId] = policy;
        
        // Create reverse lookup
        walletToAgentId[wallet] = agentId;

        emit AgentRegistered(agentId, msg.sender, wallet, metadataCID);
        emit PolicyUpdated(agentId, policy);
    }

    /**
     * @notice Update agent metadata
     * @param agentId The agent identifier
     * @param newMetadataCID New IPFS CID
     */
    function updateMetadata(
        bytes32 agentId,
        string calldata newMetadataCID
    ) external onlyOwner(agentId) {
        agents[agentId].metadataCID = newMetadataCID;
        emit AgentUpdated(agentId, newMetadataCID);
    }

    /**
     * @notice Update agent policy configuration
     * @param agentId The agent identifier
     * @param policy New policy configuration
     */
    function updatePolicy(
        bytes32 agentId,
        PolicyConfig calldata policy
    ) external onlyOwner(agentId) {
        policies[agentId] = policy;
        emit PolicyUpdated(agentId, policy);
    }

    /**
     * @notice Deactivate an agent (can be reactivated)
     * @param agentId The agent identifier
     */
    function deactivateAgent(bytes32 agentId) external onlyOwner(agentId) {
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }

    /**
     * @notice Reactivate a deactivated agent
     * @param agentId The agent identifier
     */
    function reactivateAgent(bytes32 agentId) external onlyOwner(agentId) {
        agents[agentId].active = true;
        emit AgentReactivated(agentId);
    }

    /**
     * @notice Get agent details
     * @param agentId The agent identifier
     * @return agent The agent struct
     */
    function getAgent(bytes32 agentId) external view returns (Agent memory agent) {
        agent = agents[agentId];
        if (agent.wallet == address(0)) revert AgentNotFound();
    }

    /**
     * @notice Get agent policy
     * @param agentId The agent identifier
     * @return policy The policy configuration
     */
    function getPolicy(bytes32 agentId) external view returns (PolicyConfig memory policy) {
        if (agents[agentId].wallet == address(0)) revert AgentNotFound();
        policy = policies[agentId];
    }

    /**
     * @notice Check if an agent is active
     * @param agentId The agent identifier
     * @return active True if agent exists and is active
     */
    function isAgentActive(bytes32 agentId) external view returns (bool active) {
        return agents[agentId].active;
    }

    /**
     * @notice Get agent ID from wallet address
     * @param wallet The wallet address
     * @return agentId The agent identifier (bytes32(0) if not found)
     */
    function getAgentIdByWallet(address wallet) external view returns (bytes32 agentId) {
        return walletToAgentId[wallet];
    }
}
