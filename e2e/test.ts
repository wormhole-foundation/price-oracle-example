/**
 * E2E test for cross-chain price feed using Wormhole Executor
 */

import { config, validateConfig } from './config.js';
import {
    sendPriceUpdate,
    waitForPriceUpdateReceipt,
    queryPrice,
} from './messaging.js';

async function main() {
    console.log('\n🚀 Starting PriceFeed E2E Test');
    console.log('='.repeat(60));

    // Validate configuration
    validateConfig();

    // Test data: Send bitcoin and ethereum prices
    const symbols = ['bitcoin', 'ethereum'];
    const prices = [
        BigInt(50000) * BigInt(10 ** 8), // $50,000.00 (8 decimals)
        BigInt(3000) * BigInt(10 ** 8), // $3,000.00 (8 decimals)
    ];

    console.log('\n📊 Test configuration:');
    console.log(`  Source chain: ${config.sepolia.chain}`);
    console.log(`  Destination chain: ${config.baseSepolia.chain}`);
    console.log(`  Symbols: ${symbols.join(', ')}`);
    console.log(
        `  Prices: ${symbols
            .map(
                (s, i) => `${s}=$${(Number(prices[i]) / 1e8).toLocaleString()}`
            )
            .join(', ')}`
    );

    // Send price update from Sepolia to Base Sepolia
    const { sequence } = await sendPriceUpdate(
        config.sepolia,
        config.baseSepolia,
        symbols,
        prices
    );

    if (!sequence) {
        console.error('\n❌ Failed to get sequence number from transaction');
        process.exit(1);
    }

    console.log(`\n✅ Price update sent! Sequence: ${sequence}`);
    console.log(
        '\n⏳ Waiting for VAA to be signed by Guardians and relayed by Executor...'
    );
    console.log('This typically takes 1-3 minutes on testnets.');

    // Verify on destination chain
    console.log('\n🔍 Verifying price updates on destination chain...');

    // Wait for PricesUpdated event
    const received = await waitForPriceUpdateReceipt(
        config.baseSepolia,
        symbols
    );

    if (received) {
        console.log('\n✅ Price update received on destination chain!');

        // Query individual prices to verify
        console.log('\n🔍 Querying individual prices...');
        for (const symbol of symbols) {
            const price = await queryPrice(config.baseSepolia, symbol);
            if (price !== null) {
                console.log(
                    `  ${symbol}: $${(Number(price) / 1e8).toLocaleString()}`
                );
            } else {
                console.log(`  ${symbol}: Not found`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ E2E Test PASSED!');
        console.log('='.repeat(60));
        console.log(
            'Price updates were successfully sent and received across chains! 🎉'
        );
    } else {
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  E2E Test INCOMPLETE');
        console.log('='.repeat(60));
        console.log(
            'The price update was sent but not received within the timeout period.'
        );
        console.log('This could mean:');
        console.log('  1. The Executor is still processing the delivery');
        console.log('  2. There was an issue with the relay');
        console.log('  3. Peers are not set correctly on the contracts');
        console.log('\nCheck the target chain manually or wait longer.');
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});
