/**
 * Executor utilities for the frontend
 * Self-contained to avoid import path issues with Next.js
 */

import type { Hex } from 'viem';

/**
 * Default gas limit for receiving messages on the target chain
 */
export const DEFAULT_GAS_LIMIT = 171948n;

/**
 * Default msg.value for relay instructions (no native token forwarding)
 */
export const DEFAULT_MSG_VALUE = 0n;

/**
 * Create relay instructions for the Executor quote request
 * Format: 0x01 (version byte) + uint128 gasLimit (16 bytes) + uint128 msgValue (16 bytes)
 */
export function createRelayInstructions(
    gasLimit: bigint = DEFAULT_GAS_LIMIT,
    msgValue: bigint = DEFAULT_MSG_VALUE
): Hex {
    const version = '01';
    const gasLimitHex = gasLimit.toString(16).padStart(32, '0');
    const msgValueHex = msgValue.toString(16).padStart(32, '0');
    return ('0x' + version + gasLimitHex + msgValueHex) as Hex;
}

/**
 * Calculate total cost including message fee
 */
export function calculateTotalCost(
    messageFee: bigint,
    executorCost: bigint | bigint[]
): bigint {
    const totalExecutorCost = Array.isArray(executorCost)
        ? executorCost.reduce((sum, cost) => sum + cost, 0n)
        : executorCost;
    return messageFee + totalExecutorCost;
}

export interface ExecutorQuote {
    signedQuote: Hex;
    estimatedCost: bigint;
}

export interface RelayTarget {
    chainId: number;
    gasLimit: bigint;
    totalCost: bigint;
    signedQuote: Hex;
}

// Use local API route to avoid CORS issues
const EXECUTOR_API_PROXY = '/api/executor/quote';

/**
 * Get a quote from the Executor API (via proxy)
 */
export async function getExecutorQuote(
    srcChain: number,
    dstChain: number,
    relayInstructions?: Hex
): Promise<ExecutorQuote> {
    const response = await fetch(EXECUTOR_API_PROXY, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            srcChain,
            dstChain,
            relayInstructions,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to get executor quote: ${response.statusText}`);
    }

    const data = await response.json();

    return {
        signedQuote: data.signedQuote as Hex,
        estimatedCost: BigInt(data.estimatedCost),
    };
}

/**
 * Get quotes for multiple destination chains
 */
export async function getMultiChainQuotes(
    srcChain: number,
    dstChains: number[]
): Promise<RelayTarget[]> {
    const gasLimit = DEFAULT_GAS_LIMIT * BigInt(2);
    const relayInstructions = createRelayInstructions(gasLimit, DEFAULT_MSG_VALUE);

    const quotes = await Promise.all(
        dstChains.map(async (dstChain) => {
            const quote = await getExecutorQuote(srcChain, dstChain, relayInstructions);
            return {
                chainId: dstChain,
                gasLimit,
                totalCost: quote.estimatedCost,
                signedQuote: quote.signedQuote,
            };
        })
    );

    return quotes;
}

/**
 * Transaction status from Executor API
 */
export interface ExecutorTxStatus {
    txHash: string;
    chainId: number;
    blockNumber: string;
    blockTime: string;
    status: string;
}

/**
 * Check transaction status via Executor API (via proxy)
 */
export async function checkExecutorStatus(
    txHash: string,
    chainId?: number
): Promise<ExecutorTxStatus[]> {
    const response = await fetch('/api/executor/status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            txHash,
            chainId,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to check executor status: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Poll for executor to complete relay
 * Returns when all destination chains have been processed
 */
export async function pollForExecutorCompletion(
    txHash: string,
    expectedDestChains: number[],
    timeoutMs: number = 180000, // 3 minutes
    pollIntervalMs: number = 5000 // 5 seconds
): Promise<ExecutorTxStatus[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            const statuses = await checkExecutorStatus(txHash);
            
            // Check if we have all expected destination chains
            const completedChains = statuses
                .filter(s => s.status === 'completed' || s.status === 'success')
                .map(s => s.chainId);
            
            const allComplete = expectedDestChains.every(chainId =>
                completedChains.includes(chainId)
            );

            if (allComplete) {
                return statuses;
            }

            // If we have partial results, return them
            if (statuses.length > 0) {
                return statuses;
            }
        } catch (error) {
            // Continue polling on error
            console.log('Polling executor status...', error);
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Timeout - return empty array
    return [];
}

