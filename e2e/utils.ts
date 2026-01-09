/**
 * E2E test utilities with logging
 * Wraps shared library functions with console output for test visibility
 */

import { ethers } from 'ethers';
import type { ChainConfig, SendPriceUpdateResult } from '../config/types';
import {
    queryPrice as libQueryPrice,
    getProviderAndWallet,
    getPriceFeedContract,
    calculateTotalCost,
    getMultiChainQuotes,
    getCoreBridgeAddress,
    createRelayInstructions,
    DEFAULT_GAS_LIMIT,
    DEFAULT_MSG_VALUE,
} from '../ts-lib';

/**
 * Wait for transaction and log result
 */
export async function waitForTx(
    tx: ethers.ContractTransactionResponse,
    description: string
) {
    console.log(`\n${description}`);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();

    if (receipt?.status === 1) {
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
        ['function messageFee() view returns (uint256)'],
        provider
    );

    const messageFee = await coreBridge.messageFee();
    let totalExecutorCost = 0n;
    for (const quote of quotes) {
        totalExecutorCost += quote.estimatedCost;
    }
    const totalCost = calculateTotalCost(messageFee, totalExecutorCost);

    console.log(`💰 Total cost: ${ethers.formatEther(totalCost)} ETH`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
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

    // Send transaction
    const tx = await contract.updatePrices(symbols, prices, targetChainParams, {
        value: totalCost,
    });

    const receipt = await waitForTx(tx, 'Price update');

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
            console.log(`✅ Sent (sequence: ${sentEvent.args.sequence})`);
            sequence = sentEvent.args.sequence;
        }
    }

    return { receipt, sequence };
}

/**
 * Wait for price updates to be received on the target chain with logging
 */
export async function waitForPriceUpdateReceipt(
    chainConfig: ChainConfig,
    expectedSymbols: string[]
): Promise<boolean> {
    console.log(`⏳ Waiting for ${chainConfig.chain}...`);

    const { wallet } = await getProviderAndWallet(chainConfig);
    const contract = getPriceFeedContract(
        chainConfig.priceFeedAddress,
        wallet,
        false
    );

    const filter = contract.filters.PricesReceived();

    // Poll with logging
    const startTime = Date.now();
    const timeoutMs = 120000;
    const provider = contract.runner?.provider;
    if (!provider) throw new Error('No provider available');

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);

    console.log(
        `\nPolling for PricesReceived event from block ${fromBlock}...`
    );

    while (Date.now() - startTime < timeoutMs) {
        const events = await contract.queryFilter(filter, fromBlock);

        if (events.length > 0) {
            const event = events[0] as ethers.EventLog;
            console.log(`✅ Found PricesReceived event!`);
            console.log(
                `✅ ${chainConfig.chain} received (tx: ${event.transactionHash})`
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
