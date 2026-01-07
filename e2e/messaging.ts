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
import { getExecutorQuote, calculateTotalCost } from './executor.js';
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
 */
export async function sendPriceUpdate(
    fromConfig: ChainConfig,
    toConfig: ChainConfig,
    symbols: string[],
    prices: bigint[]
): Promise<SendPriceUpdateResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(
        `Sending price update: ${fromConfig.chain} -> ${toConfig.chain}`
    );
    console.log(`${'='.repeat(60)}`);

    const abi = await loadSenderAbi();
    const { provider, wallet } = await getProviderAndWallet(fromConfig);
    const contract = getPriceFeedContract(
        fromConfig.priceFeedAddress,
        wallet,
        abi
    );

    console.log(`\nSender: ${wallet.address}`);
    console.log(`Source contract: ${fromConfig.priceFeedAddress}`);
    console.log(`Target contract: ${toConfig.priceFeedAddress}`);
    console.log(`Symbols: ${symbols.join(', ')}`);
    console.log(
        `Prices: ${prices.map((p) => ethers.formatUnits(p, 8)).join(', ')}`
    );

    // Step 1: Set gas limit for execution on target chain
    // PriceFeed requires more gas for array processing
    const gasLimit = DEFAULT_GAS_LIMIT * 2n; // Double the default for array processing

    // Step 2: Create relay instructions
    console.log('\n📋 Creating relay instructions...');
    const msgValue = DEFAULT_MSG_VALUE;
    const relayInstructions = createRelayInstructions(gasLimit, msgValue);

    console.log(`  Gas limit: ${gasLimit}`);
    console.log(`  Msg value: ${msgValue}`);
    console.log(`  Relay instructions: ${relayInstructions}`);

    // Step 3: Get Executor quote with the relay instructions
    console.log('\n💰 Getting Executor quote...');
    const quote = await getExecutorQuote({
        srcChain: fromConfig.wormholeChainId,
        dstChain: toConfig.wormholeChainId,
        relayInstructions,
    });

    console.log(`✓ Quote received!`);
    if (quote.estimatedCost) {
        console.log(
            `  Estimated executor cost: ${ethers.formatEther(
                quote.estimatedCost
            )} ETH`
        );
    }

    // Step 4: Calculate total cost (Wormhole message fee + Executor cost)
    const coreBridgeAddress = await getCoreBridgeAddress(fromConfig);

    const coreBridge = new ethers.Contract(
        coreBridgeAddress,
        ['function messageFee() view returns (uint256)'],
        provider
    );

    const messageFee = await coreBridge.messageFee();
    const totalCost = calculateTotalCost(messageFee, quote.estimatedCost);

    console.log(`\n💵 Cost breakdown:`);
    console.log(
        `  Wormhole message fee: ${ethers.formatEther(messageFee)} ETH`
    );
    if (quote.estimatedCost) {
        console.log(
            `  Executor estimated cost: ${ethers.formatEther(
                quote.estimatedCost
            )} ETH`
        );
    }
    console.log(`  Total cost: ${ethers.formatEther(totalCost)} ETH`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < totalCost) {
        throw new Error('Insufficient balance for transaction');
    }

    // Step 5: Send price update with the Executor
    console.log('\n📤 Sending price update with Executor relay...');

    const tx = await contract.updatePrices(
        symbols,
        prices,
        toConfig.wormholeChainId,
        gasLimit,
        totalCost,
        quote.signedQuote,
        { value: totalCost }
    );

    const receipt = await waitForTx(tx, 'Sending price update transaction');

    // Parse PricesUpdated event
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
        console.log('\n📨 PricesUpdated Event:');
        console.log(`  Count: ${sentEvent.args.count}`);
        console.log(`  Target Chain: ${sentEvent.args.targetChain}`);
        console.log(`  Sequence: ${sentEvent.args.sequence}`);
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
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Waiting for price updates on ${chainConfig.chain}`);
    console.log(`${'='.repeat(60)}`);

    const abi = await loadReceiverAbi();
    const { wallet } = await getProviderAndWallet(chainConfig);
    const contract = getPriceFeedContract(
        chainConfig.priceFeedAddress,
        wallet,
        abi
    );

    // Create filter for PricesReceived event
    const filter = contract.filters.PricesReceived();

    // Poll for event
    const event = await pollForEvent(
        contract,
        'PricesReceived',
        filter,
        120000 // 2 minute timeout
    );

    if (event) {
        const parsedEvent = contract.interface.parseLog({
            topics: event.topics as string[],
            data: event.data,
        });

        console.log('\n✅ PricesReceived Event:');
        console.log(`  Count: ${parsedEvent?.args.count}`);
        console.log(`  Sender Chain: ${parsedEvent?.args.senderChain}`);
        console.log(`  Sender: ${parsedEvent?.args.sender}`);
        console.log(`  Block: ${event.blockNumber}`);
        console.log(`  Transaction: ${event.transactionHash}`);

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
