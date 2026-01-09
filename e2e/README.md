# Cross-Chain Price Feed E2E Testing

This directory contains end-to-end tests for the cross-chain price feed integration using the **Wormhole Executor** service. The test demonstrates real cross-chain price updates from Sepolia to Base Sepolia and Polygon Amoy testnets using the Wormhole TypeScript SDK.

## Project Structure

```
├── .env                 # Environment variables (at project root)
├── .env.example         # Example environment file
├── config/              # Chain configuration
│   ├── index.ts         # Chain configs and validation
│   └── types.ts         # Type definitions
├── ts-lib/              # Shared library (no logging - reusable for frontend)
│   ├── index.ts         # Re-exports all utilities
│   ├── address.ts       # Address conversion utilities
│   ├── relay.ts         # Relay instructions encoding
│   ├── executor.ts      # Executor API client
│   ├── wormhole.ts      # SDK utilities
│   └── messaging.ts     # Cross-chain messaging functions
└── e2e/                 # E2E tests with logging
    ├── test.ts          # Main test file
    ├── utils.ts         # Test utilities with console output
    └── abi/             # Contract ABIs
```

## What This Does

This test suite:

1. **Requests delivery quotes** from the Wormhole Executor for multiple destination chains
2. **Sends a multi-chain price update** from Sepolia to Base Sepolia and Polygon Amoy
3. **Tracks automatic delivery** by the Executor service
4. **Verifies price receipt** on both target chains

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy Contracts

Deploy PriceFeedSender to Sepolia and PriceFeedReceiver to target chains:

```bash
# Deploy sender to Sepolia
forge script script/DeployPriceFeedSender.s.sol:DeployPriceFeedSender \
  --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast

# Deploy receiver to Base Sepolia
forge script script/DeployPriceFeedReceiver.s.sol:DeployPriceFeedReceiver \
  --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast

# Deploy receiver to Polygon Amoy
forge script script/DeployPriceFeedReceiver.s.sol:DeployPriceFeedReceiver \
  --rpc-url $POLYGON_AMOY_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

### 3. Configure Environment

Copy the example environment file to the project root:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Private keys (must have testnet ETH on all chains)
PRIVATE_KEY_SEPOLIA=0x...
PRIVATE_KEY_BASE_SEPOLIA=0x...
PRIVATE_KEY_POLYGON_AMOY=0x...

# Deployed contract addresses
PRICE_FEED_SEPOLIA=0x...
PRICE_FEED_BASE_SEPOLIA=0x...
PRICE_FEED_POLYGON_AMOY=0x...
```

### 4. Setup Peers

Register contracts as valid peers on each chain:

```bash
forge script script/SetupPeers.s.sol:SetupPeersScript \
  --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast

forge script script/SetupPeers.s.sol:SetupPeersScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast

forge script script/SetupPeers.s.sol:SetupPeersScript \
  --rpc-url $POLYGON_AMOY_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Running Tests

```bash
npm run e2e:test
```

### Test Flow

```
1. Request quotes from Executor for Base Sepolia + Polygon Amoy
2. Send price update from Sepolia (bitcoin: $50,000, ethereum: $3,000)
3. Wait for Executor to relay to both chains (1-3 min)
4. Verify prices received on Base Sepolia
5. Verify prices received on Polygon Amoy
```

## Using the Shared Library

The `ts-lib/` folder contains utilities that can be used in any TypeScript project (including frontend):

```typescript
import {
    sendPriceUpdate,
    queryPrice,
    estimatePriceUpdateCost,
    toUniversalAddress,
    fromUniversalAddress,
} from '../ts-lib/index.js';

// Estimate cost before sending
const { totalCost, breakdown } = await estimatePriceUpdateCost(config.sepolia, [
    config.baseSepolia,
    config.polygonAmoy,
]);

// Send price update
const result = await sendPriceUpdate(
    config.sepolia,
    [config.baseSepolia],
    ['bitcoin', 'ethereum'],
    [50000n * 10n ** 8n, 3000n * 10n ** 8n]
);

// Query price from any chain
const price = await queryPrice(config.baseSepolia, 'bitcoin');
```

## Resources

-   [Wormhole Documentation](https://docs.wormhole.com/)
-   [Wormhole TypeScript SDK](https://github.com/wormhole-foundation/wormhole-sdk-ts)
-   [Wormhole Scan (Testnet)](https://wormholescan.io/#/?network=Testnet)
