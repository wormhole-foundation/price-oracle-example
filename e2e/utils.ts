/**
 * E2E test utilities with logging
 * Wraps shared library functions with console output for test visibility
 */

import { formatEther, decodeEventLog, type Hash } from 'viem';
import type { ChainConfig, SendPriceUpdateResult } from '../config/types';
import {
    queryPrice as libQueryPrice,
    getClients,
    getPublicClient,
    calculateTotalCost,
    getMultiChainQuotes,
    getCoreBridgeAddress,
    createRelayInstructions,
    DEFAULT_GAS_LIMIT,
    DEFAULT_MSG_VALUE,
    PRICE_FEED_SENDER_ABI,
    PRICE_FEED_RECEIVER_ABI,
    CORE_BRIDGE_ABI,
} from '../ts-lib';

/**
 * Wait for transaction and log result
 */
export async function waitForTx(
    publicClient: Awaited<ReturnType<typeof getPublicClient>>,
    hash: Hash,
    description: string
) {
    console.log(`\n${description}`);
    console.log(`Transaction hash: ${hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
        console.log('✅ Transaction confirmed!');
        console.log(`Block: ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    } else {
        console.log('❌ Transaction failed');
    }

    return receipt;
}

/**
 * Send a cross-chain price update with logging
 */
export async function sendPriceUpdate(
    fromConfig: ChainConfig,
    toConfigs: ChainConfig[],
    symbols: string[],
    prices: bigint[]
): Promise<SendPriceUpdateResult> {
    console.log(
        `\n📤 Sending ${symbols.join(', ')} from ${
            fromConfig.chain
        } to ${toConfigs.map((c) => c.chain).join(', ')}`
    );

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

    // Calculate total cost
    const coreBridgeAddress = await getCoreBridgeAddress(fromConfig);

    const messageFee = await publicClient.readContract({
        address: coreBridgeAddress,
        abi: CORE_BRIDGE_ABI,
        functionName: 'messageFee',
    });

    let totalExecutorCost = 0n;
    for (const quote of quotes) {
        totalExecutorCost += quote.estimatedCost;
    }
    const totalCost = calculateTotalCost(messageFee, totalExecutorCost);

    console.log(`💰 Total cost: ${formatEther(totalCost)} ETH`);

    // Check balance
    const balance = await publicClient.getBalance({
        address: walletClient.account!.address,
    });
    if (balance < totalCost) {
        throw new Error('Insufficient balance for transaction');
    }

    // Build target chain params
    const targetChainParams = toConfigs.map((config, index) => ({
        chainId: config.wormholeChainId,
        gasLimit: gasLimit,
        totalCost: quotes[index].estimatedCost,
        signedQuote: quotes[index].signedQuote,
    }));

    // Send transaction using simulateContract + writeContract pattern
    const { request } = await publicClient.simulateContract({
        address: fromConfig.priceFeedAddress,
        abi: PRICE_FEED_SENDER_ABI,
        functionName: 'updatePrices',
        args: [symbols, prices, targetChainParams],
        value: totalCost,
        account: walletClient.account!,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await waitForTx(publicClient, hash, 'Price update');

    // Parse sequence from event
    let sequence: bigint | undefined;
    for (const log of receipt.logs) {
        try {
            const event = decodeEventLog({
                abi: PRICE_FEED_SENDER_ABI,
                data: log.data,
                topics: log.topics,
            });
            if (event.eventName === 'PricesUpdated') {
                const args = event.args as any;
                console.log(`✅ Sent (sequence: ${args.sequence})`);
                sequence = args.sequence;
                break;
            }
        } catch {
            // Not our event, continue
        }
    }

    return { receipt, hash, sequence };
}

/**
 * Wait for price updates to be received on the target chain with logging
 */
export async function waitForPriceUpdateReceipt(
    chainConfig: ChainConfig,
    expectedSymbols: string[]
): Promise<boolean> {
    console.log(`⏳ Waiting for ${chainConfig.chain}...`);

    const publicClient = await getPublicClient(chainConfig);

    // Get starting block
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n;

    console.log(
        `\nPolling for PricesReceived event from block ${fromBlock}...`
    );

    // Poll with logging
    const startTime = Date.now();
    const timeoutMs = 120000;

    while (Date.now() - startTime < timeoutMs) {
        const logs = await publicClient.getLogs({
            address: chainConfig.priceFeedAddress,
            event: {
                type: 'event',
                name: 'PricesReceived',
                inputs: [
                    { type: 'uint256', name: 'count', indexed: false },
                    { type: 'uint16', name: 'senderChain', indexed: false },
                    { type: 'bytes32', name: 'sender', indexed: false },
                ],
            },
            fromBlock,
            toBlock: 'latest',
        });

        if (logs.length > 0) {
            const log = logs[0];
            console.log(`✅ Found PricesReceived event!`);
            console.log(
                `✅ ${chainConfig.chain} received (tx: ${log.transactionHash})`
            );
            return true;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        process.stdout.write('.');
    }

    console.log(`\n⚠️  Timeout waiting for PricesReceived event`);
    return false;
}

/**
 * Query current price from the receiver contract with logging
 */
export async function queryPrice(
    chainConfig: ChainConfig,
    symbol: string
): Promise<bigint | null> {
    const price = await libQueryPrice(chainConfig, symbol);
    if (price === null) {
        console.error(`Error querying price for ${symbol}`);
    }
    return price;
}
