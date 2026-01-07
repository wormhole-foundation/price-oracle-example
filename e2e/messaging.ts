/**
 * Cross-chain messaging functions for PriceFeed
 */

import { ethers } from 'ethers';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { ChainConfig, SendPriceUpdateResult } from './types.js';
import {
    getProviderAndWallet,
    waitForTx,
    pollForEvent,
    getCoreBridgeAddress,
} from './utils.js';
import {
    getExecutorQuote,
    getMultiChainQuotes,
    calculateTotalCost,
} from './executor.js';
import {
    createRelayInstructions,
    DEFAULT_GAS_LIMIT,
    DEFAULT_MSG_VALUE,
} from './relay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ABIs
let priceFeedSenderAbi: any;
let priceFeedReceiverAbi: any;

async function loadSenderAbi() {
    if (!priceFeedSenderAbi) {
        const abiData = await readFile(
            join(__dirname, 'abi', 'PriceFeedSender.json'),
            'utf-8'
        );
        priceFeedSenderAbi = JSON.parse(abiData);
    }
    return priceFeedSenderAbi;
}

async function loadReceiverAbi() {
    if (!priceFeedReceiverAbi) {
        const abiData = await readFile(
            join(__dirname, 'abi', 'PriceFeedReceiver.json'),
            'utf-8'
        );
        priceFeedReceiverAbi = JSON.parse(abiData);
    }
    return priceFeedReceiverAbi;
}

function getPriceFeedContract(
    address: string,
    signerOrProvider: ethers.Wallet | ethers.Provider,
    abi: any
) {
    return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * Send a cross-chain price update using the Wormhole Executor
 * Supports sending to multiple destination chains in a single transaction
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

    const abi = await loadSenderAbi();
    const { provider, wallet } = await getProviderAndWallet(fromConfig);
    const contract = getPriceFeedContract(
        fromConfig.priceFeedAddress,
        wallet,
        abi
    );

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

    // Step 4: Calculate total cost (Wormhole message fee + Executor costs)
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

    const balance = await provider.getBalance(wallet.address);
    if (balance < totalCost) {
        throw new Error('Insufficient balance for transaction');
    }

    const targetChainParams = toConfigs.map((config, index) => ({
        chainId: config.wormholeChainId,
        gasLimit: gasLimit,
        totalCost: quotes[index].estimatedCost,
        signedQuote: quotes[index].signedQuote,
    }));

    const tx = await contract.updatePrices(symbols, prices, targetChainParams, {
        value: totalCost,
    });

    const receipt = await waitForTx(tx, 'Price update');

    const sentEvent = receipt?.logs
        .map((log) => {
            try {
                return contract.interface.parseLog({
                    topics: log.topics as string[],
                    data: log.data,
                });
            } catch {
                return null;
            }
        })
        .find((event) => event?.name === 'PricesUpdated');

    if (sentEvent) {
        console.log(`✅ Sent (sequence: ${sentEvent.args.sequence})`);
    }

    return { receipt, sequence: sentEvent?.args.sequence };
}

/**
 * Wait for price updates to be received on the target chain
 */
export async function waitForPriceUpdateReceipt(
    chainConfig: ChainConfig,
    expectedSymbols: string[]
): Promise<boolean> {
    console.log(`⏳ Waiting for ${chainConfig.chain}...`);

    const abi = await loadReceiverAbi();
    const { wallet } = await getProviderAndWallet(chainConfig);
    const contract = getPriceFeedContract(
        chainConfig.priceFeedAddress,
        wallet,
        abi
    );

    const filter = contract.filters.PricesReceived();
    const event = await pollForEvent(
        contract,
        'PricesReceived',
        filter,
        120000
    );

    if (event) {
        console.log(
            `✅ ${chainConfig.chain} received (tx: ${event.transactionHash})`
        );
        return true;
    }

    return false;
}

/**
 * Query current price from the receiver contract
 */
export async function queryPrice(
    chainConfig: ChainConfig,
    symbol: string
): Promise<bigint | null> {
    const abi = await loadReceiverAbi();
    const { provider } = await getProviderAndWallet(chainConfig);
    const contract = getPriceFeedContract(
        chainConfig.priceFeedAddress,
        provider,
        abi
    );

    try {
        const price = await contract.prices(symbol);
        return price;
    } catch (error) {
        console.error(`Error querying price for ${symbol}:`, error);
        return null;
    }
}
