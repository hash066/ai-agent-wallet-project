// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IAgentRegistry
 * @dev Interface for the AgentRegistry contract
 */
interface IAgentRegistry {
    /**
     * @dev Check if an agent exists
     * @param agentId The agent's ID
     * @return exists Whether the agent exists
     */
    function agentExists(bytes32 agentId) external view returns (bool exists);

    /**
     * @dev Get the agent's address
     * @param agentId The agent's ID
     * @return agentAddress The agent's Ethereum address
     */
    function getAgentAddress(bytes32 agentId) external view returns (address agentAddress);

    /**
     * @dev Get agent information
     * @param agentId The agent's ID
     * @return owner The owner's address
     * @return name The agent's name
     * @return isActive Whether the agent is active
     */
    function getAgent(bytes32 agentId) external view returns (
        address owner,
        string memory name,
        bool isActive
    );

    /**
     * @dev Register a new agent
     * @param agentId The agent's ID
     * @param owner The owner's address
     * @param name The agent's name
     */
    function registerAgent(bytes32 agentId, address owner, string calldata name) external;

    /**
     * @dev Update agent status
     * @param agentId The agent's ID
     * @param isActive The new active status
     */
    function setAgentStatus(bytes32 agentId, bool isActive) external;

    // Events
    event AgentRegistered(bytes32 indexed agentId, address indexed owner, string name);
    event AgentStatusUpdated(bytes32 indexed agentId, bool isActive);
}
