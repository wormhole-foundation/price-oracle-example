/**
 * Chain configuration for Wormhole cross-chain messaging
 * Single source of truth for all chain data
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import {
    toChainId,
    type Chain,
    type Network,
} from '@wormhole-foundation/sdk-base';
import type { Address, Hex } from 'viem';
import type { ChainConfig } from './types';

// Load environment variables from root .env
dotenvConfig({ path: resolve(process.cwd(), '.env') });

/**
 * Master chain configuration - single source of truth
 * Add new chains here and they'll be available everywhere
 */
export const CHAINS = {
    sepolia: {
        name: 'Sepolia',
        evmChainId: 11155111,
        wormholeChain: 'Sepolia' as Chain,
        wormholeChainId: 10002,
        rpcUrl:
            process.env.SEPOLIA_RPC_URL ||
            'https://ethereum-sepolia-rpc.publicnode.com',
        isSource: true,
    },
    baseSepolia: {
        name: 'Base Sepolia',
        evmChainId: 84532,
        wormholeChain: 'BaseSepolia' as Chain,
        wormholeChainId: 10004,
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
        isSource: false,
    },
    polygonAmoy: {
        name: 'Polygon Amoy',
        evmChainId: 80002,
        wormholeChain: 'PolygonSepolia' as Chain, // Polygon Amoy uses PolygonSepolia in SDK
        wormholeChainId: 10007,
        rpcUrl:
            process.env.POLYGON_AMOY_RPC_URL ||
            'https://rpc-amoy.polygon.technology',
        isSource: false,
    },
} as const;

export type ChainKey = keyof typeof CHAINS;

/**
 * Get chain config with environment-specific values
 */
function getChainConfig(key: ChainKey): ChainConfig {
    const chain = CHAINS[key];
    const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase(); // sepolia -> SEPOLIA, baseSepolia -> BASE_SEPOLIA

    return {
        chain: chain.wormholeChain,
        network: 'Testnet' as Network,
        rpcUrl: chain.rpcUrl,
        privateKey: process.env[`PRIVATE_KEY_${envKey}`] as Hex,
        priceFeedAddress: process.env[`PRICE_FEED_${envKey}`] as Address,
        wormholeChainId: toChainId(chain.wormholeChain),
    };
}

/**
 * Chain configurations for e2e/backend use
 */
export const config = Object.fromEntries(
    Object.keys(CHAINS).map((key) => [key, getChainConfig(key as ChainKey)])
) as Record<ChainKey, ChainConfig>;

/**
 * Validate required environment variables are set
 */
export function validateConfig() {
    const requiredVars = Object.keys(CHAINS).flatMap((key) => {
        const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
        return [`PRIVATE_KEY_${envKey}`, `PRICE_FEED_${envKey}`];
    });

    const missing = requiredVars.filter((v) => !process.env[v]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
                'Please copy .env.example to .env and fill in the values.'
        );
    }
}

export type { ChainConfig } from './types';

// Re-export relay utilities
export {
    DEFAULT_GAS_LIMIT,
    DEFAULT_MSG_VALUE,
    EXECUTOR_API_URLS,
    getExecutorApiUrl,
    createRelayInstructions,
    calculateTotalCost,
    type NetworkType,
} from './relay';

// ============================================================================
// Derived constants for frontend/lib use - auto-generated from CHAINS
// ============================================================================

/** All chain keys */
export const CHAIN_KEYS = Object.keys(CHAINS) as ChainKey[];

/** Source chain key */
export const SOURCE_CHAIN_KEY = CHAIN_KEYS.find((k) => CHAINS[k].isSource)!;

/** Destination chain keys */
export const DESTINATION_CHAIN_KEYS = CHAIN_KEYS.filter(
    (k) => !CHAINS[k].isSource
);

/** EVM chain ID by key */
export const EVM_CHAIN_IDS = Object.fromEntries(
    CHAIN_KEYS.map((k) => [k, CHAINS[k].evmChainId])
) as Record<ChainKey, number>;

/** Chain name by EVM chain ID */
export const CHAIN_NAMES: Record<number, string> = Object.fromEntries(
    CHAIN_KEYS.map((k) => [CHAINS[k].evmChainId, CHAINS[k].name])
);

/** Wormhole chain ID by EVM chain ID */
export const WORMHOLE_CHAIN_IDS: Record<number, number> = Object.fromEntries(
    CHAIN_KEYS.map((k) => [CHAINS[k].evmChainId, CHAINS[k].wormholeChainId])
);

/** RPC URL by EVM chain ID */
export const RPC_URLS: Record<number, string> = Object.fromEntries(
    CHAIN_KEYS.map((k) => [CHAINS[k].evmChainId, CHAINS[k].rpcUrl])
);

/** All EVM chain IDs */
export const ALL_EVM_CHAIN_IDS = CHAIN_KEYS.map((k) => CHAINS[k].evmChainId);

/** Source chain EVM ID */
export const SOURCE_EVM_CHAIN_ID = CHAINS[SOURCE_CHAIN_KEY].evmChainId;

/** Destination chain EVM IDs */
export const DESTINATION_EVM_CHAIN_IDS = DESTINATION_CHAIN_KEYS.map(
    (k) => CHAINS[k].evmChainId
);
