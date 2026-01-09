/**
 * Wormhole SDK utilities and chain context helpers
 */

import {
    createPublicClient,
    createWalletClient,
    http,
    type PublicClient,
    type WalletClient,
    type Chain as ViemChain,
    type Address,
    type Log,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, baseSepolia, polygonAmoy } from 'viem/chains';
import { Wormhole } from '@wormhole-foundation/sdk';
import { EvmPlatform } from '@wormhole-foundation/sdk-evm';
import type { ChainConfig } from '../config/types';

/**
 * Map chain names to viem chain configs
 */
const chainMap: Record<string, ViemChain> = {
    Sepolia: sepolia,
    BaseSepolia: baseSepolia,
    PolygonSepolia: polygonAmoy,
};

/**
 * Get Wormhole SDK context with CoreBridge addresses
 */
export async function getWormholeContext(chainConfig: ChainConfig) {
    const wh = new Wormhole(chainConfig.network, [EvmPlatform]);
    const chainContext = wh.getChain(chainConfig.chain);

    return { wh, chainContext };
}

/**
 * Get viem chain config from ChainConfig
 */
export function getViemChain(chainConfig: ChainConfig): ViemChain {
    const chain = chainMap[chainConfig.chain];
    if (!chain) {
        throw new Error(`Unsupported chain: ${chainConfig.chain}`);
    }
    return chain;
}

/**
 * Get public client for reading from chain
 */
export async function getPublicClient(
    chainConfig: ChainConfig
): Promise<PublicClient> {
    let rpcUrl = chainConfig.rpcUrl;

    if (!rpcUrl) {
        const { chainContext } = await getWormholeContext(chainConfig);
        const rpcConfig = chainContext.config.rpc;
        rpcUrl = Array.isArray(rpcConfig) ? rpcConfig[0] : rpcConfig;
    }

    const chain = getViemChain(chainConfig);

    return createPublicClient({
        chain,
        transport: http(rpcUrl),
    });
}

/**
 * Get wallet client for signing transactions
 */
export async function getWalletClient(
    chainConfig: ChainConfig
): Promise<WalletClient> {
    let rpcUrl = chainConfig.rpcUrl;

    if (!rpcUrl) {
        const { chainContext } = await getWormholeContext(chainConfig);
        const rpcConfig = chainContext.config.rpc;
        rpcUrl = Array.isArray(rpcConfig) ? rpcConfig[0] : rpcConfig;
    }

    const chain = getViemChain(chainConfig);
    const account = privateKeyToAccount(chainConfig.privateKey);

    return createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
    });
}

/**
 * Get both public and wallet clients
 */
export async function getClients(chainConfig: ChainConfig) {
    const publicClient = await getPublicClient(chainConfig);
    const walletClient = await getWalletClient(chainConfig);

    return { publicClient, walletClient };
}

/**
 * Get CoreBridge address from SDK
 */
export async function getCoreBridgeAddress(
    chainConfig: ChainConfig
): Promise<Address> {
    const { chainContext } = await getWormholeContext(chainConfig);
    const contracts = chainContext.config.contracts;

    if (!contracts?.coreBridge) {
        throw new Error(
            `CoreBridge address not found for ${chainConfig.chain}`
        );
    }

    return contracts.coreBridge as Address;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll for event with timeout (no logging)
 * Returns the event if found, null otherwise
 */
export async function pollForEvent(
    publicClient: PublicClient,
    address: Address,
    event: any,
    fromBlock: bigint,
    timeoutMs: number = 60000
): Promise<Log | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const logs = await publicClient.getLogs({
            address,
            event,
            fromBlock,
            toBlock: 'latest',
        });

        if (logs.length > 0) {
            return logs[0];
        }

        await sleep(2000);
    }

    return null;
}

/**
 * Poll for VAA to be signed and available via Wormhole Scan API
 */
export async function pollForVAA(
    emitterChain: number,
    emitterAddress: string,
    sequence: number,
    network: 'Mainnet' | 'Testnet' = 'Testnet',
    timeoutMs: number = 120000
): Promise<{ vaa: string; timestamp: string } | null> {
    const startTime = Date.now();
    const baseUrl =
        network === 'Mainnet'
            ? 'https://api.wormholescan.io'
            : 'https://api.testnet.wormholescan.io';

    const paddedEmitter = emitterAddress
        .toLowerCase()
        .replace('0x', '')
        .padStart(64, '0');
    const url = `${baseUrl}/api/v1/vaas/${emitterChain}/${paddedEmitter}/${sequence}`;

    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await fetch(url);

            if (response.ok) {
                const data = (await response.json()) as any;
                if (data.data && data.data.vaa) {
                    return {
                        vaa: data.data.vaa,
                        timestamp: data.data.timestamp,
                    };
                }
            }
        } catch (error) {
            // Ignore and continue polling
        }

        await sleep(3000);
    }

    return null;
}
