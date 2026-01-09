/**
 * Cross-chain messaging functions for PriceFeed
 */

import { ethers } from 'ethers';
import type {
    ChainConfig,
    SendPriceUpdateResult,
    TargetChainParams,
} from '../config/types';
import { getProviderAndWallet, getCoreBridgeAddress } from './wormhole';
import { getMultiChainQuotes, calculateTotalCost } from './executor';
import {
    createRelayInstructions,
    DEFAULT_GAS_LIMIT,
    DEFAULT_MSG_VALUE,
} from './relay';

/**
 * ABI for PriceFeedSender contract
 */
const PRICE_FEED_SENDER_ABI = [
    'function updatePrices(string[] calldata tokenNames, uint256[] calldata prices, tuple(uint16 chainId, uint128 gasLimit, uint256 totalCost, bytes signedQuote)[] calldata targets) external payable returns (uint64[] memory sequences)',
    'function prices(string) view returns (uint256)',
    'event PricesUpdated(uint256 count, uint16 targetChain, uint64 sequence)',
    'event LocalPricesStored(string[] tokenNames, uint256[] prices)',
];

/**
 * ABI for PriceFeedReceiver contract
 */
const PRICE_FEED_RECEIVER_ABI = [
    'function prices(string) view returns (uint256)',
    'event PricesReceived(uint256 count, uint16 senderChain, bytes32 sender)',
];

/**
 * CoreBridge ABI for message fee
 */
const CORE_BRIDGE_ABI = ['function messageFee() view returns (uint256)'];

/**
 * Get a PriceFeed contract instance
 */
export function getPriceFeedContract(
    address: string,
    signerOrProvider: ethers.Wallet | ethers.Provider,
    isSender: boolean = true
) {
    const abi = isSender ? PRICE_FEED_SENDER_ABI : PRICE_FEED_RECEIVER_ABI;
    return new ethers.Contract(address, abi, signerOrProvider);
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
    const { provider, wallet } = await getProviderAndWallet(fromConfig);
    const contract = getPriceFeedContract(
        fromConfig.priceFeedAddress,
        wallet,
        true
    );

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

    // Calculate total cost
    const coreBridgeAddress = await getCoreBridgeAddress(fromConfig);
    const coreBridge = new ethers.Contract(
        coreBridgeAddress,
        CORE_BRIDGE_ABI,
        provider
    );

    const messageFee = await coreBridge.messageFee();
    let totalExecutorCost = 0n;
    for (const quote of quotes) {
        totalExecutorCost += quote.estimatedCost;
    }
    const totalCost = calculateTotalCost(messageFee, totalExecutorCost);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
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

    // Send transaction
    const tx = await contract.updatePrices(symbols, prices, targetChainParams, {
        value: totalCost,
    });

    const receipt = await tx.wait();

    // Parse sequence from event
    let sequence: bigint | undefined;
    if (receipt) {
        const sentEvent = receipt.logs
            .map((log: any) => {
                try {
                    return contract.interface.parseLog({
                        topics: log.topics as string[],
                        data: log.data,
                    });
                } catch {
                    return null;
                }
            })
            .find((event: any) => event?.name === 'PricesUpdated');

        if (sentEvent) {
            sequence = sentEvent.args.sequence;
        }
    }

    return { receipt, sequence };
}

/**
 * Query current price from a receiver contract
 */
export async function queryPrice(
    chainConfig: ChainConfig,
    symbol: string
): Promise<bigint | null> {
    const { provider } = await getProviderAndWallet(chainConfig);
    const contract = getPriceFeedContract(
        chainConfig.priceFeedAddress,
        provider,
        false
    );

    try {
        const price = await contract.prices(symbol);
        return price;
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
    const { provider } = await getProviderAndWallet(fromConfig);

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

    const coreBridgeAddress = await getCoreBridgeAddress(fromConfig);
    const coreBridge = new ethers.Contract(
        coreBridgeAddress,
        CORE_BRIDGE_ABI,
        provider
    );

    const messageFee = await coreBridge.messageFee();
    let totalExecutorCost = 0n;
    const breakdown: { chain: string; cost: bigint }[] = [];

    for (let i = 0; i < quotes.length; i++) {
        totalExecutorCost += quotes[i].estimatedCost;
        breakdown.push({
            chain: toConfigs[i].chain,
            cost: quotes[i].estimatedCost,
        });
    }

    return {
        totalCost: calculateTotalCost(messageFee, totalExecutorCost),
        breakdown,
    };
}
