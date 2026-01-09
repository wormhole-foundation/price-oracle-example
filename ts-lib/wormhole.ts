/**
 * Wormhole SDK utilities and chain context helpers
 */

import { ethers } from 'ethers';
import { Wormhole } from '@wormhole-foundation/sdk';
import { EvmPlatform } from '@wormhole-foundation/sdk-evm';
import type { ChainConfig } from '../config/types';

/**
 * Get Wormhole SDK context with CoreBridge addresses
 */
export async function getWormholeContext(chainConfig: ChainConfig) {
    const wh = new Wormhole(chainConfig.network, [EvmPlatform]);
    const chainContext = wh.getChain(chainConfig.chain);

    return { wh, chainContext };
}

/**
 * Get provider and wallet for a chain
 * Uses SDK's default RPC if not provided in config
 */
export async function getProviderAndWallet(chainConfig: ChainConfig) {
    let rpcUrl = chainConfig.rpcUrl;

    if (!rpcUrl) {
        const { chainContext } = await getWormholeContext(chainConfig);
        const rpcConfig = chainContext.config.rpc;
        rpcUrl = Array.isArray(rpcConfig) ? rpcConfig[0] : rpcConfig;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(chainConfig.privateKey, provider);

    return { provider, wallet };
}

/**
 * Get CoreBridge address from SDK
 */
export async function getCoreBridgeAddress(
    chainConfig: ChainConfig
): Promise<string> {
    const { chainContext } = await getWormholeContext(chainConfig);
    const contracts = chainContext.config.contracts;

    if (!contracts?.coreBridge) {
        throw new Error(
            `CoreBridge address not found for ${chainConfig.chain}`
        );
    }

    return contracts.coreBridge;
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
    contract: ethers.Contract,
    filter: any,
    timeoutMs: number = 60000
): Promise<ethers.EventLog | null> {
    const startTime = Date.now();
    const provider = contract.runner?.provider;
    if (!provider) throw new Error('No provider available');

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);

    while (Date.now() - startTime < timeoutMs) {
        const events = await contract.queryFilter(filter, fromBlock);

        if (events.length > 0) {
            return events[0] as ethers.EventLog;
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
