// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IBridge
 * @notice Generic interface for cross-chain bridges
 * @dev This interface can be implemented by different bridge protocols
 */
interface IBridge {
    /**
     * @notice Send a message to another chain
     * @param destinationChainId The destination chain ID
     * @param recipient The recipient address on destination chain
     * @param message The message data to send
     * @return messageId The unique message identifier
     */
    function sendMessage(
        uint256 destinationChainId,
        address recipient,
        bytes calldata message
    ) external payable returns (bytes32 messageId);

    /**
     * @notice Estimate fee for sending a message
     * @param destinationChainId The destination chain ID
     * @param message The message data
     * @return fee The estimated fee in wei
     */
    function estimateFee(
        uint256 destinationChainId,
        bytes calldata message
    ) external view returns (uint256 fee);

    /**
     * @notice Get the status of a message
     * @param messageId The message identifier
     * @return status The message status (0=pending, 1=delivered, 2=failed)
     */
    function getMessageStatus(bytes32 messageId) external view returns (uint8 status);

    /**
     * @notice Get supported chain IDs
     * @return chainIds Array of supported chain IDs
     */
    function getSupportedChains() external view returns (uint256[] memory chainIds);

    /**
     * @notice Check if a chain is supported
     * @param chainId The chain ID to check
     * @return supported True if the chain is supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool supported);

    // Events
    event MessageSent(
        bytes32 indexed messageId,
        uint256 indexed destinationChainId,
        address indexed sender,
        address recipient,
        bytes message,
        uint256 fee
    );

    event MessageReceived(
        bytes32 indexed messageId,
        uint256 indexed sourceChainId,
        address indexed recipient,
        bytes message
    );
}
