// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AgentRegistry.sol";
import "./PolicyEngine.sol";
import "../interfaces/IBridge.sol";

/**
 * @title CrossChainExecutor
 * @notice Executes cross-chain intents with timelock and policy enforcement
 * @dev Handles intent emission, validation, and execution across chains
 */
contract CrossChainExecutor {
    // Reentrancy guard
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    struct IntentData {
        bytes32 intentId;
        bytes32 agentId;
        uint256 srcChainId;
        uint256 destChainId;
        bytes32 actionHash;
        uint256 nonce;
        uint256 expiry;
        uint256 value;
        address recipient;
    }

    struct Intent {
        bytes32 intentId;
        bytes32 agentId;
        uint256 srcChainId;
        uint256 destChainId;
        bytes32 actionHash;
        uint256 nonce;
        uint256 expiry;
        uint256 value;
        address recipient;
        address relayer;
        uint256 submittedAt;
        Status status;
    }

    enum Status {
        Pending,
        Validated,
        Submitted,
        Executed,
        Disputed,
        Failed
    }

    // Constants
    uint256 public constant TIMELOCK_DURATION = 60; // 60 seconds
    bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant INTENT_TYPEHASH = keccak256("Intent(bytes32 intentId,bytes32 agentId,uint256 srcChainId,uint256 destChainId,bytes32 actionHash,uint256 nonce,uint256 expiry,uint256 value,address recipient)");

    // State
    mapping(bytes32 => Intent) public intents;
    mapping(bytes32 => uint256) public agentNonces;
    mapping(address => bool) public authorizedRelayers;
    mapping(address => RelayerInfo) public relayerInfo;
    address[] public activeRelayers;

    struct RelayerInfo {
        address relayerAddress;
        uint256 stakeAmount;
        uint256 reputationScore;
        uint256 intentsProcessed;
        uint256 successfulExecutions;
        bool isActive;
        uint256 lastActive;
    }

    address public agentRegistry;
    address public policyEngine;

    // Bridge integration
    mapping(uint256 => address) public chainBridges; // chainId => bridge contract
    mapping(bytes32 => BridgeMessage) public bridgeMessages;

    struct BridgeMessage {
        uint256 srcChainId;
        uint256 destChainId;
        address sender;
        bytes data;
        uint256 nonce;
        bool executed;
        bytes32 messageId;
    }

    event BridgeMessageSent(
        bytes32 indexed messageId,
        uint256 indexed srcChainId,
        uint256 indexed destChainId,
        address sender,
        bytes data
    );

    event BridgeMessageReceived(
        bytes32 indexed messageId,
        uint256 indexed srcChainId,
        uint256 indexed destChainId,
        address executor
    );

    // EIP-712 Domain Separator
    function domainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256(bytes("AgentWallet")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    /**
     * @notice Verify EIP-712 signature for intent
     * @param intent The intent data
     * @param signature The signature to verify
     * @return signer The recovered signer address
     */
    function verifyIntentSignature(
        IntentData calldata intent,
        bytes calldata signature
    ) public view returns (address signer) {
        bytes32 structHash = keccak256(abi.encode(
            INTENT_TYPEHASH,
            intent.intentId,
            intent.agentId,
            intent.srcChainId,
            intent.destChainId,
            intent.actionHash,
            intent.nonce,
            intent.expiry,
            intent.value,
            intent.recipient
        ));

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            domainSeparator(),
            structHash
        ));

        // Recover signer from signature
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        signer = ecrecover(digest, v, r, s);

        require(signer != address(0), "Invalid signature");
    }

    /**
     * @notice Split signature into r, s, v components
     * @param signature The signature to split
     * @return r The r component
     * @return s The s component
     * @return v The v component
     */
    function splitSignature(bytes memory signature) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(signature.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
    }

    // Events
    event IntentEmitted(
        bytes32 indexed intentId,
        bytes32 indexed agentId,
        uint256 destChainId,
        bytes32 actionHash,
        uint256 nonce,
        uint256 expiry
    );

    event IntentSubmitted(
        bytes32 indexed intentId,
        address indexed relayer,
        uint256 timestamp
    );

    event IntentExecuted(
        bytes32 indexed intentId,
        address indexed executor,
        uint256 timestamp
    );

    event IntentDisputed(
        bytes32 indexed intentId,
        address indexed disputer,
        string reason
    );

    event RelayerAuthorized(address indexed relayer);
    event RelayerRevoked(address indexed relayer);

    // Errors
    error IntentAlreadyExists();
    error InvalidNonce();
    error IntentExpired();
    error UnauthorizedRelayer();
    error IntentNotFound();
    error IntentAlreadyExecuted();
    error TimelockNotExpired();
    error InvalidSignature();

    constructor(address _agentRegistry, address _policyEngine) {
        agentRegistry = _agentRegistry;
        policyEngine = _policyEngine;
    }

    /**
     * @notice Emit a cross-chain intent
     * @param intent The intent data
     * @param signature EIP-712 signature from agent
     */
    function emitIntent(
        IntentData calldata intent,
        bytes calldata signature
    ) external nonReentrant {
        // Validate intent doesn't already exist
        if (intents[intent.intentId].intentId != bytes32(0)) {
            revert IntentAlreadyExists();
        }

        // Validate expiry
        if (intent.expiry < block.timestamp) {
            revert IntentExpired();
        }

        // Validate nonce
        if (intent.nonce != agentNonces[intent.agentId]) {
            revert InvalidNonce();
        }

        // Validate EIP-712 signature
        address signer = verifyIntentSignature(intent, signature);

        // Verify signer is the authorized agent wallet
        AgentRegistry registry = AgentRegistry(agentRegistry);
        require(registry.isAgentActive(intent.agentId), "Agent not active");
        AgentRegistry.Agent memory agent = registry.getAgent(intent.agentId);
        require(signer == agent.wallet, "Invalid agent signature");

        // Check policy compliance via PolicyEngine
        PolicyEngine policy = PolicyEngine(policyEngine);
        require(
            policy.checkPolicy(
                intent.agentId,
                intent.value,
                intent.recipient,
                1000000000000000000, // 1 ETH daily limit (example)
                10, // 10 tx/hour limit (example)
                100000000000000000, // 0.1 ETH per tx limit (example)
                new address[](0) // No whitelist for now
            ),
            "Policy check failed"
        );

        // Store intent
        intents[intent.intentId] = Intent({
            intentId: intent.intentId,
            agentId: intent.agentId,
            srcChainId: intent.srcChainId,
            destChainId: intent.destChainId,
            actionHash: intent.actionHash,
            nonce: intent.nonce,
            expiry: intent.expiry,
            value: intent.value,
            recipient: intent.recipient,
            relayer: address(0),
            submittedAt: 0,
            status: Status.Pending
        });

        // Increment nonce
        agentNonces[intent.agentId]++;

        emit IntentEmitted(
            intent.intentId,
            intent.agentId,
            intent.destChainId,
            intent.actionHash,
            intent.nonce,
            intent.expiry
        );
    }

    /**
     * @notice Submit intent for execution (called by relayer)
     * @param intentId The intent identifier
     */
    function submitIntent(bytes32 intentId) external {
        if (!authorizedRelayers[msg.sender]) {
            revert UnauthorizedRelayer();
        }

        Intent storage intent = intents[intentId];
        if (intent.intentId == bytes32(0)) {
            revert IntentNotFound();
        }

        if (intent.status != Status.Pending) {
            revert IntentAlreadyExecuted();
        }

        intent.relayer = msg.sender;
        intent.submittedAt = block.timestamp;
        intent.status = Status.Submitted;

        emit IntentSubmitted(intentId, msg.sender, block.timestamp);
    }

    /**
     * @notice Execute intent after timelock
     * @param intentId The intent identifier
     * @param executionData The encoded execution data for the target chain
     */
    function executeIntent(bytes32 intentId, bytes calldata executionData) external nonReentrant {
        Intent storage intent = intents[intentId];
        if (intent.intentId == bytes32(0)) {
            revert IntentNotFound();
        }

        if (intent.status != Status.Submitted) {
            revert IntentAlreadyExecuted();
        }

        if (block.timestamp < intent.submittedAt + TIMELOCK_DURATION) {
            revert TimelockNotExpired();
        }

        // Decode execution data: (action, targetAddress, amount, data)
        (string memory action, address targetAddress, uint256 amount, bytes memory data) =
            abi.decode(executionData, (string, address, uint256, bytes));

        // Validate execution data matches intent
        require(
            keccak256(abi.encodePacked(action)) == intent.actionHash,
            "Action mismatch"
        );
        require(targetAddress == intent.recipient, "Recipient mismatch");
        require(amount == intent.value, "Amount mismatch");

        // Execute based on action type
        if (keccak256(abi.encodePacked(action)) == keccak256(abi.encodePacked("transfer"))) {
            // For cross-chain transfers, we would call a bridge contract
            // For now, emit event for off-chain processing
            emit IntentExecuted(intentId, msg.sender, block.timestamp);

        } else if (keccak256(abi.encodePacked(action)) == keccak256(abi.encodePacked("call"))) {
            // For cross-chain contract calls
            // This would integrate with a messaging bridge
            emit IntentExecuted(intentId, msg.sender, block.timestamp);

        } else {
            revert("Unsupported action");
        }

        intent.status = Status.Executed;
    }

    /**
     * @notice Dispute an intent (watchdog function)
     * @param intentId The intent identifier
     * @param reason The dispute reason
     */
    function disputeIntent(bytes32 intentId, string calldata reason) external {
        Intent storage intent = intents[intentId];
        if (intent.intentId == bytes32(0)) {
            revert IntentNotFound();
        }

        intent.status = Status.Disputed;

        emit IntentDisputed(intentId, msg.sender, reason);
    }

    /**
     * @notice Authorize a relayer (only contract owner)
     * @param relayer The relayer address
     */
    function authorizeRelayer(address relayer) external {
        require(msg.sender == owner(), "Only owner can authorize relayers");
        require(relayer != address(0), "Invalid relayer address");
        authorizedRelayers[relayer] = true;
        emit RelayerAuthorized(relayer);
    }

    /**
     * @notice Revoke a relayer (only contract owner)
     * @param relayer The relayer address
     */
    function revokeRelayer(address relayer) external {
        require(msg.sender == owner(), "Only owner can revoke relayers");
        authorizedRelayers[relayer] = false;
        emit RelayerRevoked(relayer);
    }

    /**
     * @notice Get contract owner
     * @return The owner address
     */
    function owner() public view returns (address) {
        return agentRegistry; // Use agent registry as owner for now
    }

    /**
     * @notice Get intent details
     * @param intentId The intent identifier
     * @return intent The intent struct
     */
    function getIntent(bytes32 intentId) external view returns (Intent memory intent) {
        intent = intents[intentId];
        if (intent.intentId == bytes32(0)) {
            revert IntentNotFound();
        }
    }

    /**
     * @notice Register as a relayer with stake
     * @param stakeAmount Amount to stake (in wei)
     */
    function registerRelayer(uint256 stakeAmount) external payable {
        require(stakeAmount >= 0.1 ether, "Minimum stake is 0.1 ETH");
        require(msg.value >= stakeAmount, "Insufficient stake amount");

        RelayerInfo storage info = relayerInfo[msg.sender];
        require(!info.isActive, "Already registered");

        info.relayerAddress = msg.sender;
        info.stakeAmount = stakeAmount;
        info.reputationScore = 100; // Start with neutral reputation
        info.intentsProcessed = 0;
        info.successfulExecutions = 0;
        info.isActive = true;
        info.lastActive = block.timestamp;

        activeRelayers.push(msg.sender);

        emit RelayerAuthorized(msg.sender);
    }

    /**
     * @notice Unregister as relayer and withdraw stake
     */
    function unregisterRelayer() external {
        RelayerInfo storage info = relayerInfo[msg.sender];
        require(info.isActive, "Not registered");

        // Remove from active relayers array
        for (uint256 i = 0; i < activeRelayers.length; i++) {
            if (activeRelayers[i] == msg.sender) {
                activeRelayers[i] = activeRelayers[activeRelayers.length - 1];
                activeRelayers.pop();
                break;
            }
        }

        uint256 stakeToReturn = info.stakeAmount;
        info.isActive = false;
        info.stakeAmount = 0;

        // Transfer stake back
        payable(msg.sender).transfer(stakeToReturn);

        emit RelayerRevoked(msg.sender);
    }

    /**
     * @notice Select best relayer for intent based on reputation and load
     * @param intentId The intent identifier
     * @return selectedRelayer The selected relayer address
     */
    function selectRelayer(bytes32 intentId) external view returns (address selectedRelayer) {
        require(activeRelayers.length > 0, "No active relayers");

        // Simple selection algorithm: choose relayer with highest reputation score
        // In production, this would consider load balancing, geographic distribution, etc.
        uint256 bestScore = 0;
        address bestRelayer = address(0);

        for (uint256 i = 0; i < activeRelayers.length; i++) {
            address relayer = activeRelayers[i];
            RelayerInfo memory info = relayerInfo[relayer];

            if (info.isActive) {
                uint256 score = info.reputationScore;

                // Bonus for recent activity
                if (block.timestamp - info.lastActive < 1 hours) {
                    score += 10;
                }

                // Penalty for low success rate
                if (info.intentsProcessed > 0) {
                    uint256 successRate = (info.successfulExecutions * 100) / info.intentsProcessed;
                    if (successRate < 80) {
                        score = score * successRate / 100;
                    }
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestRelayer = relayer;
                }
            }
        }

        require(bestRelayer != address(0), "No suitable relayer found");
        return bestRelayer;
    }

    /**
     * @notice Update relayer reputation after intent execution
     * @param relayer The relayer address
     * @param success Whether the execution was successful
     */
    function updateRelayerReputation(address relayer, bool success) external {
        // Only allow updates from authorized entities (could be the contract itself or watchdog)
        require(msg.sender == address(this) || authorizedRelayers[msg.sender], "Unauthorized");

        RelayerInfo storage info = relayerInfo[relayer];
        require(info.isActive, "Relayer not active");

        info.intentsProcessed++;
        if (success) {
            info.successfulExecutions++;
            // Increase reputation for success
            if (info.reputationScore < 200) {
                info.reputationScore += 1;
            }
        } else {
            // Decrease reputation for failure
            if (info.reputationScore > 10) {
                info.reputationScore -= 5;
            }
        }

        info.lastActive = block.timestamp;
    }

    /**
     * @notice Get active relayer count
     * @return count Number of active relayers
     */
    function getActiveRelayerCount() external view returns (uint256 count) {
        return activeRelayers.length;
    }

    /**
     * @notice Get relayer by index
     * @param index The index in active relayers array
     * @return relayer The relayer address
     */
    function getActiveRelayer(uint256 index) external view returns (address relayer) {
        require(index < activeRelayers.length, "Index out of bounds");
        return activeRelayers[index];
    }

    /**
     * @notice Send cross-chain message via bridge
     * @param destinationChainId The destination chain ID
     * @param message The message data to send
     * @return messageId The unique message identifier
     */
    function sendBridgeMessage(
        uint256 destinationChainId,
        bytes calldata message
    ) external payable returns (bytes32 messageId) {
        address bridgeContract = chainBridges[destinationChainId];
        require(bridgeContract != address(0), "Bridge not configured for chain");

        IBridge bridge = IBridge(bridgeContract);

        // Send message via bridge
        messageId = bridge.sendMessage{value: msg.value}(
            destinationChainId,
            address(this), // This contract as recipient
            message
        );

        // Store bridge message tracking
        bridgeMessages[messageId] = BridgeMessage({
            srcChainId: block.chainid,
            destChainId: destinationChainId,
            sender: msg.sender,
            data: message,
            nonce: 0, // Not used for bridge messages
            executed: false,
            messageId: messageId
        });

        emit BridgeMessageSent(
            messageId,
            block.chainid,
            destinationChainId,
            msg.sender,
            message
        );

        return messageId;
    }

    /**
     * @notice Receive cross-chain message from bridge
     * @param messageId The message identifier
     * @param sourceChainId The source chain ID
     * @param sender The sender address
     * @param message The message data
     */
    function receiveBridgeMessage(
        bytes32 messageId,
        uint256 sourceChainId,
        address sender,
        bytes calldata message
    ) external {
        // Verify caller is a configured bridge
        bool isValidBridge = false;
        for (uint256 i = 0; i < getSupportedChains().length; i++) {
            uint256 chainId = getSupportedChains()[i];
            if (chainBridges[chainId] == msg.sender) {
                isValidBridge = true;
                break;
            }
        }
        require(isValidBridge, "Unauthorized bridge");

        // Mark message as executed
        bridgeMessages[messageId].executed = true;

        emit BridgeMessageReceived(
            messageId,
            sourceChainId,
            address(this),
            message
        );

        // Process the received message (could trigger intent execution)
        // This would be customized based on message content
    }

    /**
     * @notice Set bridge contract for a chain
     * @param chainId The chain ID
     * @param bridgeContract The bridge contract address
     */
    function setChainBridge(uint256 chainId, address bridgeContract) external {
        require(msg.sender == owner(), "Only owner can set bridges");
        require(bridgeContract != address(0), "Invalid bridge contract");
        chainBridges[chainId] = bridgeContract;
    }

    /**
     * @notice Get supported chains (chains with configured bridges)
     * @return chainIds Array of supported chain IDs
     */
    function getSupportedChains() public view returns (uint256[] memory chainIds) {
        uint256[] memory tempChains = new uint256[](10); // Max 10 chains
        uint256 count = 0;

        // Common chain IDs to check
        uint256[10] memory commonChains = [uint256(1), 5, 10, 56, 137, 42161, 43114, 80001, 11155111, 80002];

        for (uint256 i = 0; i < commonChains.length && count < tempChains.length; i++) {
            if (chainBridges[commonChains[i]] != address(0)) {
                tempChains[count] = commonChains[i];
                count++;
            }
        }

        // Resize array to actual count
        chainIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            chainIds[i] = tempChains[i];
        }

        return chainIds;
    }

    /**
     * @notice Estimate bridge fee for a message
     * @param destinationChainId The destination chain ID
     * @param message The message data
     * @return fee The estimated fee in wei
     */
    function estimateBridgeFee(
        uint256 destinationChainId,
        bytes calldata message
    ) external view returns (uint256 fee) {
        address bridgeContract = chainBridges[destinationChainId];
        if (bridgeContract == address(0)) return 0;

        IBridge bridge = IBridge(bridgeContract);
        return bridge.estimateFee(destinationChainId, message);
    }

    /**
     * @notice Get bridge message status
     * @param messageId The message identifier
     * @return status The message status (0=pending, 1=delivered, 2=failed)
     */
    function getBridgeMessageStatus(bytes32 messageId) external view returns (uint8 status) {
        BridgeMessage memory message = bridgeMessages[messageId];
        if (message.messageId == bytes32(0)) return 2; // failed/not found

        if (message.executed) return 1; // delivered

        // Check with bridge contract if available
        address bridgeContract = chainBridges[message.destChainId];
        if (bridgeContract != address(0)) {
            IBridge bridge = IBridge(bridgeContract);
            return bridge.getMessageStatus(messageId);
        }

        return 0; // pending
    }

    /**
     * @notice Get agent nonce
     * @param agentId The agent identifier
     * @return nonce The current nonce
     */
    function getNonce(bytes32 agentId) external view returns (uint256 nonce) {
        return agentNonces[agentId];
    }
}
