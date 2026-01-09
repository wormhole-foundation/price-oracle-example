/**
 * Chain configuration for Wormhole cross-chain messaging
 * Loads environment variables and provides chain configs
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import {
    toChainId,
    type Chain,
    type Network,
} from '@wormhole-foundation/sdk-base';
import type { ChainConfig } from './types';

// Load environment variables from root .env
dotenvConfig({ path: resolve(process.cwd(), '.env') });

/**
 * Chain configurations for supported testnets
 */
export const config = {
    sepolia: {
        chain: 'Sepolia' as Chain,
        network: 'Testnet' as Network,
        rpcUrl: process.env.SEPOLIA_RPC_URL,
        privateKey: process.env.PRIVATE_KEY_SEPOLIA!,
        priceFeedAddress: process.env.PRICE_FEED_SEPOLIA!,
        wormholeChainId: toChainId('Sepolia'),
    } as ChainConfig,
    baseSepolia: {
        chain: 'BaseSepolia' as Chain,
        network: 'Testnet' as Network,
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
        privateKey: process.env.PRIVATE_KEY_BASE_SEPOLIA!,
        priceFeedAddress: process.env.PRICE_FEED_BASE_SEPOLIA!,
        wormholeChainId: toChainId('BaseSepolia'),
    } as ChainConfig,
    polygonAmoy: {
        chain: 'PolygonSepolia' as Chain, // Polygon Amoy uses PolygonSepolia in SDK
        network: 'Testnet' as Network,
        rpcUrl: process.env.POLYGON_AMOY_RPC_URL,
        privateKey: process.env.PRIVATE_KEY_POLYGON_AMOY!,
        priceFeedAddress: process.env.PRICE_FEED_POLYGON_AMOY!,
        wormholeChainId: toChainId('PolygonSepolia'),
    } as ChainConfig,
};

/**
 * Validate required environment variables are set
 */
export function validateConfig() {
    const requiredVars = [
        'PRIVATE_KEY_SEPOLIA',
        'PRIVATE_KEY_BASE_SEPOLIA',
        'PRIVATE_KEY_POLYGON_AMOY',
        'PRICE_FEED_SEPOLIA',
        'PRICE_FEED_BASE_SEPOLIA',
        'PRICE_FEED_POLYGON_AMOY',
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
                'Please copy .env.example to .env and fill in the values.'
        );
    }
}

export type { ChainConfig } from './types';
