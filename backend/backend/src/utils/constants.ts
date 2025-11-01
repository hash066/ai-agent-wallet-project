// AI Agent Wallet Constants
// Contract addresses and configuration

// Chain IDs
export const CHAIN_IDS = {
  SEPOLIA: 11155111,
  AMOY: 80002,
  ETHEREUM: 1,
  POLYGON: 137,
} as const;

// Contract Addresses (Mock addresses - replace with real deployed addresses)
// TODO: Update these with addresses from deployments/sepolia.json and deployments/amoy.json
export const CONTRACT_ADDRESSES = {
  SEPOLIA: {
    AGENT_REGISTRY: '0x1234567890123456789012345678901234567890',
    POLICY_ENGINE: '0x2345678901234567890123456789012345678901',
    AUDIT_LOG: '0x3456789012345678901234567890123456789012',
    AGENT_ORACLE_CONSUMER: '0x4567890123456789012345678901234567890123',
    AGENT_MARKETPLACE: '0x5678901234567890123456789012345678901234',
    AGENT_COLLABORATION: '0x6789012345678901234567890123456789012345',
    CROSS_CHAIN_EXECUTOR: '0x7890123456789012345678901234567890123456',
  },
  AMOY: {
    AGENT_REGISTRY: '0x8901234567890123456789012345678901234567',
    POLICY_ENGINE: '0x9012345678901234567890123456789012345678',
    AUDIT_LOG: '0x0123456789012345678901234567890123456789',
    AGENT_ORACLE_CONSUMER: '0x1234567890123456789012345678901234567890',
    AGENT_MARKETPLACE: '0x2345678901234567890123456789012345678901',
    AGENT_COLLABORATION: '0x3456789012345678901234567890123456789012',
    CROSS_CHAIN_EXECUTOR: '0x4567890123456789012345678901234567890123',
  },
} as const;

// Chainlink Price Feed Addresses (Sepolia testnet)
export const CHAINLINK_FEEDS = {
  SEPOLIA: {
    ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // ETH/USD
    BTC_USD: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43', // BTC/USD
    LINK_USD: '0xc59E3633BAAC79493d908e63626716e204A45Ed43', // LINK/USD
  },
} as const;

// Agent Autonomy Configuration
export const AGENT_CONFIG = {
  DEFAULT_LOOP_INTERVAL_SECONDS: 30,
  MAX_TRANSACTIONS_PER_HOUR: 5,
  MIN_BALANCE_ETH: 0.1, // Minimum balance to allow oracle requests
  ORACLE_REQUEST_FEE: '1000000000000000', // 0.001 ETH in wei
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// Decision Engine Rules
export const DECISION_RULES = {
  BALANCE_THRESHOLD: 0.1, // ETH
  HOURLY_TX_LIMIT: 5,
  ORACLE_PRICE_TRIGGERS: {
    ETH_PRICE_HIGH: 3000, // USD
    ETH_PRICE_LOW: 2000,   // USD
  },
} as const;

// API Configuration
export const API_CONFIG = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  AGENT_ACTIVITY_LIMIT: 100,
} as const;

// Gas Configuration
export const GAS_CONFIG = {
  ESTIMATE_MULTIPLIER: 1.2,
  MAX_GAS_PRICE_GWEI: 50,
} as const;

// Helper functions
export function getContractAddress(chainId: number, contractName: keyof typeof CONTRACT_ADDRESSES.SEPOLIA): string {
  const network = chainId === CHAIN_IDS.SEPOLIA ? 'SEPOLIA' : 'AMOY';
  return CONTRACT_ADDRESSES[network][contractName];
}

export function getChainlinkFeedAddress(chainId: number, feedName: keyof typeof CHAINLINK_FEEDS.SEPOLIA): string {
  if (chainId !== CHAIN_IDS.SEPOLIA) {
    throw new Error(`Chainlink feeds only available on Sepolia testnet, got chainId: ${chainId}`);
  }
  return CHAINLINK_FEEDS.SEPOLIA[feedName];
}

export function isSupportedChain(chainId: number): boolean {
  return Object.values(CHAIN_IDS).includes(chainId as any);
}
