import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

export class AlchemyProvider {
  public sepoliaProvider: ethers.JsonRpcProvider | null = null;
  public amoyProvider: ethers.JsonRpcProvider | null = null;
  private initialized = false;
  
  constructor() {
    // Don't throw error, allow lazy initialization
  }

  private initialize() {
    if (this.initialized) return;
    
    const sepoliaUrl = process.env.ALCHEMY_SEPOLIA_URL;
    const amoyUrl = process.env.ALCHEMY_AMOY_URL;
    
    if (!sepoliaUrl || !amoyUrl) {
      logger.warn('Alchemy RPC URLs not configured. Blockchain features will be unavailable.');
      logger.warn('Set ALCHEMY_SEPOLIA_URL and ALCHEMY_AMOY_URL in .env to enable blockchain features.');
      this.initialized = true;
      return;
    }
    
    try {
      this.sepoliaProvider = new ethers.JsonRpcProvider(sepoliaUrl);
      this.amoyProvider = new ethers.JsonRpcProvider(amoyUrl);
      logger.info('Alchemy providers initialized');
      this.initialized = true;
    } catch (error: any) {
      logger.error('Failed to initialize Alchemy providers:', error.message);
      this.initialized = true;
    }
  }
  
  async getSepoliaBlockNumber(): Promise<number> {
    this.initialize();
    if (!this.sepoliaProvider) {
      throw new Error('Sepolia provider not configured. Set ALCHEMY_SEPOLIA_URL in .env');
    }
    return await this.sepoliaProvider.getBlockNumber();
  }
  
  async getAmoyBlockNumber(): Promise<number> {
    this.initialize();
    if (!this.amoyProvider) {
      throw new Error('Amoy provider not configured. Set ALCHEMY_AMOY_URL in .env');
    }
    return await this.amoyProvider.getBlockNumber();
  }
  
  async getSepoliaSigner(): Promise<ethers.Wallet> {
    this.initialize();
    if (!this.sepoliaProvider) {
      throw new Error('Sepolia provider not configured');
    }
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Missing RELAYER_PRIVATE_KEY in environment');
    }
    return new ethers.Wallet(privateKey, this.sepoliaProvider);
  }
  
  async getAmoySigner(): Promise<ethers.Wallet> {
    this.initialize();
    if (!this.amoyProvider) {
      throw new Error('Amoy provider not configured');
    }
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Missing RELAYER_PRIVATE_KEY in environment');
    }
    return new ethers.Wallet(privateKey, this.amoyProvider);
  }
}

// Lazy singleton - won't fail if env vars are missing
let _alchemyProvider: AlchemyProvider | null = null;

export function getAlchemyProvider(): AlchemyProvider {
  if (!_alchemyProvider) {
    _alchemyProvider = new AlchemyProvider();
  }
  return _alchemyProvider;
}

export const alchemyProvider = getAlchemyProvider();

export function getProvider(): ethers.Provider | null {
  getAlchemyProvider().initialize();
  return getAlchemyProvider().sepoliaProvider;
}
