// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PolicyEngine
 * @notice On-chain rate limits and circuit breakers
 * @dev Enforces spending limits, transaction counts, and emergency pause
 */
contract PolicyEngine {
    struct RollingWindow {
        uint256 dailySpent;
        uint256 dailyWindowStart;
        uint256 hourlyTxCount;
        uint256 hourlyWindowStart;
    }

    struct CircuitBreakerConfig {
        uint256 suspiciousActivityThreshold;
        uint256 cooldownPeriod;
        bool tripped;
        uint256 trippedAt;
    }

    // State variables
    mapping(bytes32 => RollingWindow) public rollingWindows;
    CircuitBreakerConfig public circuitBreaker;
    bool public paused;
    address public emergencyAdmin;
    
    mapping(bytes32 => bool) public agentPaused; // Per-agent pause
    
    // Events
    event PolicyChecked(bytes32 indexed agentId, bool approved, string reason);
    event CircuitBreakerTripped(uint256 timestamp, string reason);
    event CircuitBreakerReset(uint256 timestamp);
    event EmergencyPaused(address indexed admin);
    event EmergencyUnpaused(address indexed admin);
    event AgentPaused(bytes32 indexed agentId);
    event AgentUnpaused(bytes32 indexed agentId);

    // Errors
    error SystemPaused();
    error AgentIsPaused(bytes32 agentId);
    error CircuitBreakerActive();
    error UnauthorizedAdmin();
    error PolicyViolation(string reason);

    /**
     * @notice Constructor
     */
    constructor() {
        emergencyAdmin = msg.sender;
        circuitBreaker = CircuitBreakerConfig({
            suspiciousActivityThreshold: 10,
            cooldownPeriod: 1 hours,
            tripped: false,
            trippedAt: 0
        });
    }

    /**
     * @notice Check if action complies with policy
     * @param agentId The agent identifier
     * @param value Transaction value in wei
     * @param recipient Recipient address
     * @param maxSpendPerDay Daily spending limit
     * @param maxTxPerHour Hourly transaction limit
     * @param maxValuePerTx Per-transaction limit
     * @param whitelistedAddresses Allowed recipients
     * @return approved True if policy allows
     */
    function checkPolicy(
        bytes32 agentId,
        uint256 value,
        address recipient,
        uint256 maxSpendPerDay,
        uint256 maxTxPerHour,
        uint256 maxValuePerTx,
        address[] calldata whitelistedAddresses
    ) external returns (bool approved) {
        // Check system-wide pause
        if (paused) revert SystemPaused();
        
        // Check agent-specific pause
        if (agentPaused[agentId]) revert AgentIsPaused(agentId);
        
        // Check circuit breaker
        if (circuitBreaker.tripped) {
            if (block.timestamp < circuitBreaker.trippedAt + circuitBreaker.cooldownPeriod) {
                revert CircuitBreakerActive();
            } else {
                // Auto-reset after cooldown
                circuitBreaker.tripped = false;
                emit CircuitBreakerReset(block.timestamp);
            }
        }

        RollingWindow storage window = rollingWindows[agentId];

        // Check per-transaction limit
        if (value > maxValuePerTx) {
            emit PolicyChecked(agentId, false, "Exceeds maxValuePerTx");
            revert PolicyViolation("Exceeds maxValuePerTx");
        }

        // Update daily window if needed
        if (block.timestamp >= window.dailyWindowStart + 1 days) {
            window.dailySpent = 0;
            window.dailyWindowStart = block.timestamp;
        }

        // Check daily spending limit
        if (window.dailySpent + value > maxSpendPerDay) {
            emit PolicyChecked(agentId, false, "Exceeds maxSpendPerDay");
            revert PolicyViolation("Exceeds maxSpendPerDay");
        }

        // Update hourly window if needed
        if (block.timestamp >= window.hourlyWindowStart + 1 hours) {
            window.hourlyTxCount = 0;
            window.hourlyWindowStart = block.timestamp;
        }

        // Check hourly transaction limit
        if (window.hourlyTxCount >= maxTxPerHour) {
            emit PolicyChecked(agentId, false, "Exceeds maxTxPerHour");
            
            // Trip circuit breaker if suspicious
            _checkCircuitBreaker(agentId);
            
            revert PolicyViolation("Exceeds maxTxPerHour");
        }

        // Check whitelist if provided
        if (whitelistedAddresses.length > 0) {
            bool isWhitelisted = false;
            for (uint256 i = 0; i < whitelistedAddresses.length; i++) {
                if (whitelistedAddresses[i] == recipient) {
                    isWhitelisted = true;
                    break;
                }
            }
            if (!isWhitelisted) {
                emit PolicyChecked(agentId, false, "Recipient not whitelisted");
                revert PolicyViolation("Recipient not whitelisted");
            }
        }

        // Update counters (Effects before Interactions)
        window.dailySpent += value;
        window.hourlyTxCount++;

        emit PolicyChecked(agentId, true, "Approved");
        return true;
    }

    /**
     * @notice Emergency pause all operations
     */
    function pause() external {
        if (msg.sender != emergencyAdmin) revert UnauthorizedAdmin();
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @notice Unpause operations
     */
    function unpause() external {
        if (msg.sender != emergencyAdmin) revert UnauthorizedAdmin();
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }

    /**
     * @notice Pause specific agent
     * @param agentId The agent to pause
     */
    function pauseAgent(bytes32 agentId) external {
        if (msg.sender != emergencyAdmin) revert UnauthorizedAdmin();
        agentPaused[agentId] = true;
        emit AgentPaused(agentId);
    }

    /**
     * @notice Unpause specific agent
     * @param agentId The agent to unpause
     */
    function unpauseAgent(bytes32 agentId) external {
        if (msg.sender != emergencyAdmin) revert UnauthorizedAdmin();
        agentPaused[agentId] = false;
        emit AgentUnpaused(agentId);
    }

    /**
     * @notice Check and potentially trip circuit breaker
     * @param agentId Agent triggering check
     */
    function _checkCircuitBreaker(bytes32 agentId) internal {
        // Simple heuristic: if agent hits rate limit, increment counter
        // In production, this would be more sophisticated
        if (!circuitBreaker.tripped) {
            circuitBreaker.tripped = true;
            circuitBreaker.trippedAt = block.timestamp;
            emit CircuitBreakerTripped(block.timestamp, "Rate limit exceeded");
        }
    }

    /**
     * @notice Get rolling window data for agent
     * @param agentId The agent identifier
     * @return window The rolling window data
     */
    function getRollingWindow(bytes32 agentId) external view returns (RollingWindow memory window) {
        return rollingWindows[agentId];
    }

    /**
     * @notice Check if system is operational
     * @return operational True if not paused and circuit breaker not tripped
     */
    function isOperational() external view returns (bool operational) {
        if (paused) return false;
        if (circuitBreaker.tripped && block.timestamp < circuitBreaker.trippedAt + circuitBreaker.cooldownPeriod) {
            return false;
        }
        return true;
    }
}
