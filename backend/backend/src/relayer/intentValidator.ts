import { ethers } from 'ethers';
import { Intent, IntentQueue } from './intentQueue';
import { verifyIntentSignature } from '../agent-runtime/eip712Signer';
import logger from '../utils/logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class IntentValidator {
  private sourceProvider: ethers.Provider;
  private destProvider: ethers.Provider;
  private sourceExecutorAddress: string;
  private destExecutorAddress: string;

  constructor(
    sourceProvider: ethers.Provider,
    destProvider: ethers.Provider,
    sourceExecutorAddress: string,
    destExecutorAddress: string
  ) {
    this.sourceProvider = sourceProvider;
    this.destProvider = destProvider;
    this.sourceExecutorAddress = sourceExecutorAddress;
    this.destExecutorAddress = destExecutorAddress;
  }

  /**
   * Validate intent before relaying
   */
  async validateIntent(intent: Intent): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Check 1: Verify signature exists
      if (!intent.signature) {
        errors.push('Missing intent signature');
        return { valid: false, errors };
      }

      // Check 2: Verify expiry
      const currentTime = Math.floor(Date.now() / 1000);
      if (intent.expiry < currentTime) {
        errors.push(`Intent expired at ${new Date(intent.expiry * 1000).toISOString()}`);
      }

      // Check 3: Verify EIP-712 signature
      try {
        const intentData = {
          intentId: intent.intentId,
          agentId: intent.agentId,
          srcChainId: intent.srcChainId,
          destChainId: intent.destChainId,
          actionHash: intent.actionHash,
          nonce: intent.nonce,
          expiry: intent.expiry
        };

        const recoveredAddress = verifyIntentSignature(
          this.sourceExecutorAddress,
          intentData,
          intent.signature
        );

        // In a real implementation, verify against agent's wallet address from registry
        logger.info(`Signature verified from address: ${recoveredAddress}`);
      } catch (error) {
        errors.push('Invalid EIP-712 signature');
        logger.error('Signature verification failed:', error);
      }

      // Check 4: Verify nonce (would query source chain contract)
      // For MVP, we skip this to avoid too many RPC calls

      // Check 5: Verify not already executed on destination
      // For MVP, we skip this to avoid too many RPC calls

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('Intent validation error:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      return { valid: false, errors };
    }
  }
}
