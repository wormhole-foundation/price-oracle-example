/**
 * Cross-chain messaging functions for PriceFeed
 */

import {
    type PublicClient,
    type WalletClient,
    type Address,
    getContract,
    decodeEventLog,
} from 'viem';
import type {
    ChainConfig,
    SendPriceUpdateResult,
    TargetChainParams,
} from '../config/types';
import {
    PriceFeedSenderABI,
    PriceFeedReceiverABI,
    CoreBridgeABI,
} from '../config/abi';
import { getClients, getCoreBridgeAddress } from './wormhole';
import { getMultiChainQuotes, calculateTotalCost } from './executor';
import {
    createRelayInstructions,
    DEFAULT_GAS_LIMIT,
    DEFAULT_MSG_VALUE,
} from './relay';

// Re-export ABIs for convenience
export { PriceFeedSenderABI, PriceFeedReceiverABI, CoreBridgeABI };

/**
 * Get a PriceFeed contract instance (viem getContract pattern)
 */
export function getPriceFeedContract(
    address: Address,
    publicClient: PublicClient,
    walletClient?: WalletClient,
    isSender: boolean = true
) {
    const abi = isSender ? PriceFeedSenderABI : PriceFeedReceiverABI;
    return getContract({
        address,
        abi,
        client: walletClient
            ? { public: publicClient, wallet: walletClient }
            : publicClient,
    });
}

/**
 * Send a cross-chain price update using the Wormhole Executor
 * Supports sending to multiple destination chains in a single transaction
 *
 * @returns SendPriceUpdateResult with receipt and sequence
 */
export async function sendPriceUpdate(
    fromConfig: ChainConfig,
    toConfigs: ChainConfig[],
    symbols: string[],
    prices: bigint[]
): Promise<SendPriceUpdateResult> {
    const { publicClient, walletClient } = await getClients(fromConfig);

    // Build relay instructions
    const gasLimit = DEFAULT_GAS_LIMIT * 2n;
    const msgValue = DEFAULT_MSG_VALUE;
    const relayInstructions = createRelayInstructions(gasLimit, msgValue);

    // Get quotes for all destination chains
    const quotes = await getMultiChainQuotes(
        fromConfig.wormholeChainId,
        toConfigs.map((config) => ({
            chainId: config.wormholeChainId,
            relayInstructions,
        }))
    );

    // Calculate total cost - contract expects exact sum of target costs (no message fee)
    let totalCost = 0n;
    for (const quote of quotes) {
        totalCost += quote.estimatedCost;
    }

    // Check balance
    const balance = await publicClient.getBalance({
        address: walletClient.account!.address,
    });
    if (balance < totalCost) {
        throw new Error('Insufficient balance for transaction');
    }

    // Build target chain params
    const targetChainParams: TargetChainParams[] = toConfigs.map(
        (config, index) => ({
            chainId: config.wormholeChainId,
            gasLimit: gasLimit,
            totalCost: quotes[index].estimatedCost,
            signedQuote: quotes[index].signedQuote,
        })
    );

    // Send transaction using writeContract directly (skip simulate for complex struct arrays)
    const hash = await walletClient.writeContract({
        address: fromConfig.priceFeedAddress,
        abi: PriceFeedSenderABI,
        functionName: 'updatePrices',
        args: [symbols, prices, targetChainParams],
        value: totalCost,
        chain: walletClient.chain,
        account: walletClient.account!,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Parse sequence from event
    let sequence: bigint | undefined;
    for (const log of receipt.logs) {
        try {
            const event = decodeEventLog({
                abi: PriceFeedSenderABI,
                data: log.data,
                topics: log.topics,
            });
            if (event.eventName === 'PricesUpdated') {
                sequence = (event.args as any).sequence;
                break;
            }
        } catch {
            // Not our event, continue
        }
    }

    return { receipt, hash, sequence };
}

/**
 * Query current price from a receiver contract
 */
export async function queryPrice(
    chainConfig: ChainConfig,
    symbol: string
): Promise<bigint | null> {
    const { publicClient } = await getClients(chainConfig);

    try {
        const price = await publicClient.readContract({
            address: chainConfig.priceFeedAddress,
            abi: PriceFeedReceiverABI,
            functionName: 'prices',
            args: [symbol],
        });
        return price as bigint;
    } catch (error) {
        return null;
    }
}

/**
 * Get the cost estimate for a multi-chain price update
 */
export async function estimatePriceUpdateCost(
    fromConfig: ChainConfig,
    toConfigs: ChainConfig[]
): Promise<{
    totalCost: bigint;
    breakdown: { chain: string; cost: bigint }[];
}> {
    const gasLimit = DEFAULT_GAS_LIMIT * 2n;
    const msgValue = DEFAULT_MSG_VALUE;
    const relayInstructions = createRelayInstructions(gasLimit, msgValue);

    const quotes = await getMultiChainQuotes(
        fromConfig.wormholeChainId,
        toConfigs.map((config) => ({
            chainId: config.wormholeChainId,
            relayInstructions,
        }))
    );

    let totalCost = 0n;
    const breakdown: { chain: string; cost: bigint }[] = [];

    for (let i = 0; i < quotes.length; i++) {
        totalCost += quotes[i].estimatedCost;
        breakdown.push({
            chain: toConfigs[i].chain,
            cost: quotes[i].estimatedCost,
        });
    }

    return {
        totalCost,
        breakdown,
    };
}
