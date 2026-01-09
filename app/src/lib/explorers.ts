/**
 * Block explorer utilities
 */

import { sepolia, baseSepolia, polygonAmoy } from 'wagmi/chains';

export const EXPLORERS: Record<number, { name: string; url: string }> = {
    [sepolia.id]: {
        name: 'Etherscan',
        url: 'https://sepolia.etherscan.io',
    },
    [baseSepolia.id]: {
        name: 'BaseScan',
        url: 'https://sepolia.basescan.org',
    },
    [polygonAmoy.id]: {
        name: 'PolygonScan',
        url: 'https://amoy.polygonscan.com',
    },
};

export function getTxUrl(chainId: number, hash: string): string {
    const explorer = EXPLORERS[chainId];
    return explorer ? `${explorer.url}/tx/${hash}` : '';
}

export function getExplorerName(chainId: number): string {
    return EXPLORERS[chainId]?.name || 'Explorer';
}

// Wormhole Scan URL for VAA lookup
export function getWormholeScanUrl(chainId: number, txHash: string): string {
    return `https://wormholescan.io/#/tx/${txHash}?network=Testnet`;
}

// Executor Explorer URL
export function getExecutorExplorerUrl(txHash: string): string {
    const endpoint = encodeURIComponent('https://executor-testnet.labsapis.com');
    return `https://wormholelabs-xyz.github.io/executor-explorer/#/tx/${txHash}?endpoint=${endpoint}&env=Testnet`;
}
