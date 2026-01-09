/**
 * Chain configurations for the frontend
 * Self-contained to avoid import path issues with Next.js
 */

import { sepolia, baseSepolia, polygonAmoy, type Chain } from 'wagmi/chains';

// Chain configuration - source of truth for the frontend
const CHAINS = {
    sepolia: {
        name: 'Sepolia',
        evmChainId: 11155111,
        wormholeChainId: 10002,
        isSource: true,
    },
    baseSepolia: {
        name: 'Base Sepolia',
        evmChainId: 84532,
        wormholeChainId: 10004,
        isSource: false,
    },
    polygonAmoy: {
        name: 'Polygon Amoy',
        evmChainId: 80002,
        wormholeChainId: 10007,
        isSource: false,
    },
} as const;

type ChainKey = keyof typeof CHAINS;
const CHAIN_KEYS = Object.keys(CHAINS) as ChainKey[];

// Derived constants
export const CHAIN_NAMES: Record<number, string> = Object.fromEntries(
    CHAIN_KEYS.map((k) => [CHAINS[k].evmChainId, CHAINS[k].name])
);

export const WORMHOLE_CHAIN_IDS: Record<number, number> = Object.fromEntries(
    CHAIN_KEYS.map((k) => [CHAINS[k].evmChainId, CHAINS[k].wormholeChainId])
);

export const RPC_URLS: Record<number, string> = {
    [sepolia.id]: 'https://ethereum-sepolia-rpc.publicnode.com',
    [baseSepolia.id]: 'https://sepolia.base.org',
    [polygonAmoy.id]: 'https://rpc-amoy.polygon.technology',
};

const SOURCE_EVM_CHAIN_ID = CHAIN_KEYS.find((k) => CHAINS[k].isSource)
    ? CHAINS[CHAIN_KEYS.find((k) => CHAINS[k].isSource)!].evmChainId
    : sepolia.id;

const DESTINATION_EVM_CHAIN_IDS = CHAIN_KEYS.filter((k) => !CHAINS[k].isSource).map(
    (k) => CHAINS[k].evmChainId
);

// Map EVM chain IDs to wagmi chain objects
const WAGMI_CHAINS: Record<number, Chain> = {
    [sepolia.id]: sepolia,
    [baseSepolia.id]: baseSepolia,
    [polygonAmoy.id]: polygonAmoy,
};

// Build chains from config
export const SUPPORTED_CHAINS = CHAIN_KEYS.map(
    (k) => WAGMI_CHAINS[CHAINS[k].evmChainId]
).filter(Boolean) as Chain[];

export const SOURCE_CHAIN = WAGMI_CHAINS[SOURCE_EVM_CHAIN_ID];

export const DESTINATION_CHAINS = DESTINATION_EVM_CHAIN_IDS.map(
    (id) => WAGMI_CHAINS[id]
).filter(Boolean) as Chain[];

export function getChainName(chainId: number): string {
    return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

export function getWormholeChainId(chainId: number): number {
    return WORMHOLE_CHAIN_IDS[chainId] || 0;
}

export function getEvmChainId(wormholeChainId: number): number {
    const entry = Object.entries(WORMHOLE_CHAIN_IDS).find(
        ([_, whId]) => whId === wormholeChainId
    );
    return entry ? Number(entry[0]) : 0;
}

export function isSourceChain(chainId: number): boolean {
    return chainId === SOURCE_EVM_CHAIN_ID;
}

export function isDestinationChain(chainId: number): boolean {
    return (DESTINATION_EVM_CHAIN_IDS as readonly number[]).includes(chainId);
}
