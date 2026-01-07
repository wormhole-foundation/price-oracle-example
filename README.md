# Cross-Chain Price Feed Oracle

Cross-chain price oracle using Wormhole Executor. Broadcast token prices to multiple chains simultaneously.

## Features

✅ Multi-chain broadcasting (1 transaction → N chains)  
✅ Array-based price updates  
✅ Role-based access control  
✅ Peer validation & replay protection

## Quick Start

```bash
forge install && npm install
forge test

# Deploy contracts
forge script script/DeployPriceFeedSender.s.sol --rpc-url $RPC --private-key $KEY --broadcast
forge script script/DeployPriceFeedReceiver.s.sol --rpc-url $RPC --private-key $KEY --broadcast
```

## Architecture

**PriceFeedSender** - Broadcasts to multiple chains in one transaction  
**PriceFeedReceiver** - Validates peer, stores prices, emits events

| Chain        | Wormhole ID | CoreBridge      | Executor        |
| ------------ | ----------- | --------------- | --------------- |
| Sepolia      | 10002       | `0x4a8bc80E...` | `0xD0fb39f5...` |
| Base Sepolia | 10004       | `0x79A1027a...` | `0x51B47D49...` |
| Polygon Amoy | 10007       | `0x6b9C8671...` | `0x7056721C...` |

## Setup Peers

Use the SetupPeers script to configure peer relationships:

```bash
# Set up peers on each chain
forge script script/SetupPeers.s.sol:SetupPeersScript \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $PRIVATE_KEY_SEPOLIA --broadcast

forge script script/SetupPeers.s.sol:SetupPeersScript \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY_BASE_SEPOLIA --broadcast

forge script script/SetupPeers.s.sol:SetupPeersScript \
  --rpc-url https://rpc-amoy.polygon.technology \
  --private-key $PRIVATE_KEY_POLYGON_AMOY --broadcast --legacy
```

**Note**: Script uses SDK's `toUniversalAddress()` for proper Wormhole Universal Address format.

## Usage

### Multi-Chain Price Update (New!)

Send prices to multiple chains in a single transaction:

```solidity
// Solidity: updatePrices(tokenNames, prices, targets[])
struct TargetChainParams {
    uint16 chainId;        // Wormhole chain ID
    uint128 gasLimit;      // Gas limit for execution
    uint256 totalCost;     // Cost including executor fee
    bytes signedQuote;     // Signed quote from executor
}

string[] memory tokens = ["bitcoin", "ethereum"];
uint256[] memory prices = [50000e8, 3000e8];

TargetChainParams[] memory targets = new TargetChainParams[](2);
targets[0] = TargetChainParams(10004, 500000, 0.005 ether, quote1);  // Base Sepolia
targets[1] = TargetChainParams(10007, 500000, 0.005 ether, quote2);  // Polygon Amoy

priceFeedSender.updatePrices{value: 0.01 ether}(tokens, prices, targets);
```

TypeScript (E2E):

```typescript
await sendPriceUpdate(
    config.sepolia,
    [config.baseSepolia, config.polygonAmoy], // Multiple targets!
    ['bitcoin', 'ethereum'],
    [50000n * 10n ** 8n, 3000n * 10n ** 8n]
);
```

Query prices on any chain:

````bash
cast call $PRICE_FEED_BASE_SEPOLIA "prices(string)" "bitcoin" --rpc-url https://sepolia.base.org
```solidity
// Multi-chain broadcast
TargetChainParams[] memory targets = new TargetChainParams[](2);
targets[0] = TargetChainParams(10004, 500000, 0.005 ether, quote1);
targets[1] = TargetChainParams(10007, 500000, 0.005 ether, quote2);

priceFeedSender.updatePrices{value: 0.01 ether}(
    ["bitcoin", "ethereum"],
    [50000e8, 3000e8],
    targets
);
````

```bash
# Query prices
cast call $RECEIVER "prices(string)" "bitcoin" --rpc-url $RPC

# E2E test
npm run e2e:test
```

## Resources

-   [Wormhole Docs](https://wormhole.com/docs)
-   [Solidity SDK](https://github.com/wormhole-foundation/wormhole-solidity-sdk)
-   [Executor Explorer](https://wormholelabs-xyz.github.io/executor-explorer)
