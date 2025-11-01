// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IBridge.sol";

/**
 * @title NomadBridge
 * @notice Nomad protocol bridge implementation
 * @dev Integrates with Nomad's cross-chain messaging system
 */
contract NomadBridge is IBridge {
    // Nomad contract addresses (example - replace with actual deployed addresses)
    mapping(uint256 => address) public nomadCoreContracts;
    mapping(uint256 => bytes32) public nomadDomains; // Chain ID to Nomad domain mapping

    address public owner;
    uint256 public nextMessageId;

    // Message tracking
    mapping(bytes32 => Message) public messages;
    mapping(bytes32 => uint8) public messageStatuses; // 0=pending, 1=delivered, 2=failed

    struct Message {
        uint256 sourceChainId;
        uint256 destinationChainId;
        address sender;
        address recipient;
        bytes data;
        uint256 timestamp;
        uint256 fee;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextMessageId = 1;

        // Initialize with common chain mappings (update with actual Nomad domains)
        nomadDomains[1] = bytes32(uint256(0x657468)); // Ethereum
        nomadDomains[137] = bytes32(uint256(0x706f6c79)); // Polygon
        nomadDomains[56] = bytes32(uint256(0x627363)); // BSC
        nomadDomains[43114] = bytes32(uint256(0x61766178)); // Avalanche
        nomadDomains[10] = bytes32(uint256(0x6f707469)); // Optimism
        nomadDomains[42161] = bytes32(uint256(0x617262)); // Arbitrum
    }

    /**
     * @notice Send a message via Nomad
     * @param destinationChainId The destination chain ID
     * @param recipient The recipient address on destination chain
     * @param message The message data to send
     * @return messageId The unique message identifier
     */
    function sendMessage(
        uint256 destinationChainId,
        address recipient,
        bytes calldata message
    ) external payable override returns (bytes32 messageId) {
        require(isChainSupported(destinationChainId), "Chain not supported");
        require(recipient != address(0), "Invalid recipient");

        // Generate unique message ID
        messageId = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            recipient,
            message,
            nextMessageId++
        ));

        // Estimate and validate fee
        uint256 requiredFee = estimateFee(destinationChainId, message);
        require(msg.value >= requiredFee, "Insufficient fee");

        // Store message details
        messages[messageId] = Message({
            sourceChainId: block.chainid,
            destinationChainId: destinationChainId,
            sender: msg.sender,
            recipient: recipient,
            data: message,
            timestamp: block.timestamp,
            fee: msg.value
        });

        messageStatuses[messageId] = 0; // pending

        // Get Nomad domain for destination chain
        bytes32 destinationDomain = nomadDomains[destinationChainId];
        require(destinationDomain != bytes32(0), "Domain not configured");

        // In a real implementation, this would call the Nomad core contract
        // For now, we emit the event and mark as sent
        // address nomadCore = nomadCoreContracts[destinationChainId];
        // INomadCore(nomadCore).sendMessage{value: msg.value}(
        //     destinationDomain,
        //     bytes32(uint256(uint160(recipient))),
        //     message
        // );

        emit MessageSent(
            messageId,
            destinationChainId,
            msg.sender,
            recipient,
            message,
            msg.value
        );

        return messageId;
    }

    /**
     * @notice Estimate fee for Nomad message
     * @param destinationChainId The destination chain ID
     * @param message The message data
     * @return fee The estimated fee in wei
     */
    function estimateFee(
        uint256 destinationChainId,
        bytes calldata message
    ) external view override returns (uint256 fee) {
        // Base fee calculation (simplified)
        uint256 baseFee = 0.001 ether; // Base cross-chain fee
        uint256 gasEstimate = 100000; // Estimated gas for message processing
        uint256 gasPrice = 20000000000; // 20 gwei

        // Add message size fee
        uint256 messageSizeFee = (message.length * 100) * 1e9; // 100 gwei per byte

        return baseFee + (gasEstimate * gasPrice) + messageSizeFee;
    }

    /**
     * @notice Get message status
     * @param messageId The message identifier
     * @return status The message status (0=pending, 1=delivered, 2=failed)
     */
    function getMessageStatus(bytes32 messageId) external view override returns (uint8 status) {
        return messageStatuses[messageId];
    }

    /**
     * @notice Process received message (called by Nomad relayers)
     * @param sourceDomain The source Nomad domain
     * @param sender The sender address
     * @param messageId The message identifier
     * @param message The message data
     */
    function receiveMessage(
        bytes32 sourceDomain,
        bytes32 sender,
        bytes32 messageId,
        bytes calldata message
    ) external {
        // In real implementation, this would be called by Nomad's bridge contracts
        // For now, we simulate message receipt

        // Convert domain back to chain ID
        uint256 sourceChainId = getChainIdFromDomain(sourceDomain);
        address recipient = address(uint160(uint256(sender)));

        // Mark message as delivered
        messageStatuses[messageId] = 1; // delivered

        emit MessageReceived(
            messageId,
            sourceChainId,
            recipient,
            message
        );
    }

    /**
     * @notice Get supported chain IDs
     * @return chainIds Array of supported chain IDs
     */
    function getSupportedChains() external view override returns (uint256[] memory chainIds) {
        uint256[] memory supported = new uint256[](6);
        supported[0] = 1;      // Ethereum
        supported[1] = 137;    // Polygon
        supported[2] = 56;     // BSC
        supported[3] = 43114;  // Avalanche
        supported[4] = 10;     // Optimism
        supported[5] = 42161;  // Arbitrum
        return supported;
    }

    /**
     * @notice Check if a chain is supported
     * @param chainId The chain ID to check
     * @return supported True if the chain is supported
     */
    function isChainSupported(uint256 chainId) public view override returns (bool supported) {
        return nomadDomains[chainId] != bytes32(0);
    }

    /**
     * @notice Set Nomad core contract address for a chain
     * @param chainId The chain ID
     * @param coreContract The Nomad core contract address
     */
    function setNomadCoreContract(uint256 chainId, address coreContract) external onlyOwner {
        nomadCoreContracts[chainId] = coreContract;
    }

    /**
     * @notice Set Nomad domain for a chain
     * @param chainId The chain ID
     * @param domain The Nomad domain
     */
    function setNomadDomain(uint256 chainId, bytes32 domain) external onlyOwner {
        nomadDomains[chainId] = domain;
    }

    /**
     * @notice Convert Nomad domain to chain ID
     * @param domain The Nomad domain
     * @return chainId The corresponding chain ID
     */
    function getChainIdFromDomain(bytes32 domain) public pure returns (uint256 chainId) {
        if (domain == bytes32(uint256(0x657468))) return 1;        // Ethereum
        if (domain == bytes32(uint256(0x706f6c79))) return 137;     // Polygon
        if (domain == bytes32(uint256(0x627363))) return 56;       // BSC
        if (domain == bytes32(uint256(0x61766178))) return 43114;   // Avalanche
        if (domain == bytes32(uint256(0x6f707469))) return 10;      // Optimism
        if (domain == bytes32(uint256(0x617262))) return 42161;     // Arbitrum
        return 0; // Unknown
    }

    /**
     * @notice Withdraw accumulated fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner).transfer(balance);
    }

    /**
     * @notice Get contract balance
     * @return balance The contract's ETH balance
     */
    function getBalance() external view returns (uint256 balance) {
        return address(this).balance;
    }
}
