/**
 * Executor API client for getting quotes and relay status
 * API Docs: https://github.com/wormholelabs-xyz/example-messaging-executor/blob/main/api-docs/main.tsp
 */

import type { Network, Chain } from '@wormhole-foundation/sdk-base';
import type {
    ExecutorQuoteParams,
    ExecutorQuote,
    ExecutorCapabilities,
} from '../config/types';

/**
 * Calculate total cost including message fee
 * Accepts either a single bigint or array of executor costs
 */
export function calculateTotalCost(
    messageFee: bigint,
    executorCost: bigint | bigint[]
): bigint {
    const totalExecutorCost = Array.isArray(executorCost)
        ? executorCost.reduce((sum, cost) => sum + cost, BigInt(0))
        : executorCost;
    return messageFee + totalExecutorCost;
}

/**
 * Get the Executor API URL for the given network from the SDK
 * Source: https://github.com/wormhole-foundation/wormhole-sdk-ts/blob/main/core/base/src/constants/executor.ts
 */
export async function getExecutorApiUrl(network: Network): Promise<string> {
    const sdk = (await import('@wormhole-foundation/sdk-base')) as any;
    return sdk.executor.executorAPI(network);
}

/**
 * Get capabilities for all chains from the Executor API
 */
export async function getExecutorCapabilities(
    network: Network = 'Testnet'
): Promise<Record<number, ExecutorCapabilities>> {
    const apiUrl = await getExecutorApiUrl(network);
    const url = `${apiUrl}/capabilities`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch capabilities: ${response.statusText}`);
    }

    return (await response.json()) as Record<number, ExecutorCapabilities>;
}

/**
 * Get a quote from the Executor API using SDK's fetchQuote function
 *
 * The Executor provides automatic cross-chain message delivery.
 * This function requests a signed quote for delivering a message.
 */
export async function getExecutorQuote(
    params: ExecutorQuoteParams,
    network: Network = 'Testnet'
): Promise<ExecutorQuote> {
    const apiUrl = await getExecutorApiUrl(network);

    const sdkDefs = (await import(
        '@wormhole-foundation/sdk-definitions'
    )) as any;
    const quote = await sdkDefs.fetchQuote(
        apiUrl,
        params.srcChain,
        params.dstChain,
        params.relayInstructions
    );

    const estimatedCost = BigInt(quote.estimatedCost);
    return {
        signedQuote: quote.signedQuote,
        estimatedCost: estimatedCost,
    };
}

/**
 * Get quotes for multiple destination chains
 * Useful for multi-chain price updates
 */
export async function getMultiChainQuotes(
    srcChain: number,
    dstChains: Array<{ chainId: number; relayInstructions: string }>,
    network: Network = 'Testnet'
): Promise<ExecutorQuote[]> {
    const quotes: ExecutorQuote[] = [];

    for (const dst of dstChains) {
        const quote = await getExecutorQuote(
            {
                srcChain,
                dstChain: dst.chainId,
                relayInstructions: dst.relayInstructions,
            },
            network
        );
        quotes.push(quote);
    }

    return quotes;
}

/**
 * Check transaction status via Executor API
 *
 * API Endpoint: POST /v0/status/tx
 */
export async function checkTransactionStatus(
    txHash: string,
    chainId?: number,
    network: Network = 'Testnet'
): Promise<
    Array<{
        txHash: string;
        chainId: number;
        blockNumber: string;
        blockTime: string;
        status: string;
    }>
> {
    const apiUrl = await getExecutorApiUrl(network);
    const url = `${apiUrl}/status/tx`;

    const response = await fetch(url, {
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
        throw new Error(`Failed to check status: ${response.statusText}`);
    }

    return (await response.json()) as Array<{
        txHash: string;
        chainId: number;
        blockNumber: string;
        blockTime: string;
        status: string;
    }>;
}

/**
 * Poll for Executor to process the VAA and check its status
 * Uses the SDK's fetchStatus function
 * Returns an array of StatusResponse objects when the transaction is found
 */
export async function pollForExecutorStatus(
    chain: Chain,
    txHash: string,
    network: Network = 'Testnet',
    timeoutMs: number = 60000
): Promise<any> {
    const startTime = Date.now();

    const sdkDefs = (await import(
        '@wormhole-foundation/sdk-definitions'
    )) as any;
    const apiUrl = await getExecutorApiUrl(network);

    while (Date.now() - startTime < timeoutMs) {
        try {
            const status = await sdkDefs.fetchStatus(apiUrl, txHash, chain);

            if (Array.isArray(status) && status.length > 0) {
                return status;
            }
        } catch (error) {
            // Ignore errors and continue polling
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    return [
        {
            status: 'timeout',
            message: 'Executor did not process transaction within timeout',
        },
    ];
}
