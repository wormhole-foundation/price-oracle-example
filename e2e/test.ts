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
    console.log('\n🚀 Cross-Chain Price Feed E2E Test');
    console.log('='.repeat(60));

    validateConfig();

    const symbols = ['bitcoin', 'ethereum'];
    const prices = [
        BigInt(50000) * BigInt(10 ** 8),
        BigInt(3000) * BigInt(10 ** 8),
    ];

    console.log(
        `Sending ${symbols.join(', ')} from ${config.sepolia.chain} to ${
            config.baseSepolia.chain
        } + ${config.polygonAmoy.chain}`
    );

    // Send price update from Sepolia to Base Sepolia AND Polygon Amoy
    const { receipt } = await sendPriceUpdate(
        config.sepolia,
        [config.baseSepolia, config.polygonAmoy],
        symbols,
        prices
    );

    if (!receipt) {
        console.error('\n❌ Failed to send transaction');
        process.exit(1);
    }

    console.log('\n⏳ Waiting for Executor relay (1-3 min)...\n');

    const baseReceived = await waitForPriceUpdateReceipt(
        config.baseSepolia,
        symbols
    );
    const polygonReceived = await waitForPriceUpdateReceipt(
        config.polygonAmoy,
        symbols
    );

    if (baseReceived && polygonReceived) {
        console.log('\n📊 Verifying prices:');
        for (const symbol of symbols) {
            const basePrice = await queryPrice(config.baseSepolia, symbol);
            const polyPrice = await queryPrice(config.polygonAmoy, symbol);
            console.log(
                `  ${symbol}: $${(
                    Number(basePrice) / 1e8
                ).toLocaleString()} (both chains)`
            );
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ E2E Test PASSED!');
        console.log('='.repeat(60));
    } else {
        console.log('\n❌ Test incomplete:');
        console.log(`  Base Sepolia: ${baseReceived ? '✅' : '❌'}`);
        console.log(`  Polygon Amoy: ${polygonReceived ? '✅' : '❌'}`);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});
