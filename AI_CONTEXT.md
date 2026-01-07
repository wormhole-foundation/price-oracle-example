# AI Agent Context - Cross-Chain Price Feed Oracle

This document provides complete context for AI agents working with this codebase.

## Project Overview

Cross-chain price feed oracle using Wormhole Executor architecture. **Broadcasts token prices from Sepolia to multiple destination chains (Base Sepolia, Polygon Amoy) in a single transaction.**

## Key Features

-   **Multi-Chain Broadcasting** - Send same price payload to 2+ chains simultaneously
-   **TargetChainParams Structure** - Array of targets with individual executor quotes
-   **Gas Optimization** - Encode payload once, send to N chains
-   **Atomic Multi-Chain Updates** - All chains receive identical price data

## Key Files

### Contracts

-   `src/PriceFeedSender.sol` - Sender contract (Sepolia), extends ExecutorSend, **supports multi-chain targets**
-   `src/PriceFeedReceiver.sol` - Receiver contract (Base Sepolia, Polygon Amoy), extends ExecutorReceive
-   `script/utils/ChainIdHelper.sol` - Utility library for EVM ↔ Wormhole chain ID conversion (40+ chains)

### Tests

-   `test/PriceFeed.t.sol` - 23 comprehensive tests with fork testing, VAA crafting, and multi-chain scenarios
-   `test/utils/ChainIdHelper.t.sol` - 4 tests for chain ID utility

### E2E Tests

-   `e2e/test.ts` - E2E test that sends prices to Base Sepolia AND Polygon Amoy
-   `e2e/config.ts` - Configuration for Sepolia, Base Sepolia, Polygon Amoy
-   `e2e/executor.ts` - `getMultiChainQuotes()` for batch quote requests
-   `e2e/messaging.ts` - `sendPriceUpdate()` accepts array of target chains

### Deployment

-   `script/DeployPriceFeedSender.s.sol` - Deploy sender to Sepolia (supports Sepolia, Base Sepolia, Polygon Amoy)
-   `script/DeployPriceFeedReceiver.s.sol` - Deploy receiver to any chain (Base Sepolia, Polygon Amoy, etc.)
-   `script/SetupPeers.s.sol` - Configure peer relationships (updated for Polygon Amoy)

## Important Notes

### Peer Address Format (CRITICAL)

When setting peers, use **Wormhole Universal Address format** (left-padding):

```solidity
// CORRECT - zeros on the LEFT
bytes32 peer = bytes32(uint256(uint160(address)));
// Result: 0x000000000000000000000000bbd81bcdc0bb81f2f5e0e2fa1005b24a1d1a18af

// WRONG - zeros on the RIGHT (causes "Hex size exceeds padding" error)
bytes32 peer = bytes32(uint256(uint160(address)) << 96);
// Result: 0xbbd81bcdc0bb81f2f5e0e2fa1005b24a1d1a18af000000000000000000000000
```

The Executor uses `fromUniversalAddress()` which expects first 12 bytes to be zero.

### Why Multi-Chain Broadcasting?

1. **Efficiency** - One transaction sends to N chains instead of N transactions
2. **Atomicity** - All chains receive the same data at the same time
3. **Cost Savings** - Single payload encoding, single message fee from CoreBridge
4. **Consistency** - Guaranteed identical price data across all destination chains

### Why TargetChainParams Array?

Replaced single-chain parameters with array of structs:

```solidity
struct TargetChainParams {
    uint16 chainId;        // Wormhole chain ID of destination
    uint128 gasLimit;      // Gas limit for execution on that chain
    uint256 totalCost;     // Executor cost for that chain
    bytes signedQuote;     // Signed quote from executor for that chain
}
```

Benefits:

-   Flexible: 1 to N destination chains
-   Executor quotes per chain (different gas costs)
-   Clear cost attribution
-   Future-proof for additional parameters

### Why Separate Sender/Receiver?

1. **Gas Optimization** - Smaller contract size per chain
2. **Clear Separation** - Sender has PRICE_FEED_ROLE, receiver validates peers
3. **Security** - Each contract only has the permissions it needs
4. **Scalability** - Deploy 1 sender, N receivers across chains

### Why Array-Based Prices?

-   For single price: use 1-element array
-   For batch: use N-element arrays
-   Benefits: simpler code, no backward compatibility logic, cleaner events

### Supported Testnets

-   **Sepolia** (Sender) - Ethereum L1 testnet with full Wormhole support
-   **Base Sepolia** (Receiver) - L2 scalability, low gas costs
-   **Polygon Amoy** (Receiver) - High throughput, multi-chain reach

## Important Constants

### Wormhole Chain IDs

-   Sepolia: `10002` (EVM: `11155111`)
-   Base Sepolia: `10004` (EVM: `84532`)
-   Polygon Amoy: `10007` (EVM: `80002`)

### Contract Addresses

**Sepolia:**

-   CoreBridge: `0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78`
-   Executor: `0xD0fb39f5a3361F21457653cB70F9D0C9bD86B66B`

**Base Sepolia:**

-   CoreBridge: `0x79A1027a6A159502049F10906D333EC57E95F083`
-   Executor: `0x51B47D493CBA7aB97e3F8F163D6Ce07592CE4482`

**Polygon Amoy:**

-   CoreBridge: `0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35`
-   Executor: `0x7056721C33De437f0997F67BC87521cA86b721d3`

## Function Signatures

### PriceFeedSender (Multi-Chain)

```solidity
struct TargetChainParams {
    uint16 chainId;
    uint128 gasLimit;
    uint256 totalCost;
    bytes signedQuote;
}

function updatePrices(
    string[] calldata tokenNames,
    uint256[] calldata pricesArray,
    TargetChainParams[] calldata targets  // NEW: Array of targets!
) external payable onlyRole(PRICE_FEED_ROLE) returns (uint64[] memory sequences)

function setPeer(uint16 chainId, bytes32 peerAddress) external onlyRole(PEER_ADMIN_ROLE)

mapping(string => uint256) public prices;
```

### PriceFeedReceiver

```solidity
function executeVAAv1(bytes calldata multiSigVaa) external payable virtual
    // Called by Executor, triggers _executeVaa internally

function setPeer(uint16 chainId, bytes32 peerAddress) external onlyRole(PEER_ADMIN_ROLE)

mapping(string => uint256) public prices;
```

## Events

**Sender:**

-   `PricesUpdated(uint256 count, uint16 targetChain, uint64 sequence)` - Emitted once per target chain
-   `LocalPricesStored(string[] tokenNames, uint256[] prices)` - Emitted once before broadcasting

**Receiver:**

-   `PricesReceived(uint256 count, uint16 senderChain, bytes32 sender)`

## Errors

**Both Contracts:**

-   `NoValueAllowed()` - Rejects non-zero msg.value
-   `ArrayLengthMismatch()` - Token names and prices arrays don't match
-   `EmptyArray()` - Cannot process empty arrays

**SDK Errors:**

-   `InvalidPeer()` - Message from unauthorized sender (tested in test_RevertOnInvalidPeer)

## Testing Patterns

### Fork Testing

Tests use `vm.createFork()` with Sepolia and Base Sepolia (note: still uses Base Sepolia for testing even though deployment targets Monad).

### VAA Crafting

```solidity
bytes memory signedVaa = WormholeOverride.craftVaa(
    ICoreBridge(baseSepoliaCoreBridge),
    CHAIN_ID_SEPOLIA,
    address(priceFeedSender).toUniversalAddress(),
    payload
);
```

### Test Setup

1. Create forks for both chains
2. Setup WormholeOverride on both
3. Deploy sender and receiver
4. Configure peer relationships
5. Craft VAAs for cross-chain testing

## Deployment Flow

1. Deploy PriceFeedSender on Sepolia using `DeployPriceFeedSender.s.sol`
2. Deploy PriceFeedReceiver on Base Sepolia/Polygon Amoy using `DeployPriceFeedReceiver.s.sol`
3. Setup peer relationships using `SetupPeers.s.sol` (runs on each chain)
4. Grant PRICE_FEED_ROLE to authorized feeders

**Note**: SetupPeers script automatically uses SDK's `toUniversalAddress()` for correct format.

## Security Considerations

1. **Peer Validation** - `_getPeer()` returns configured peer, SDK validates in `_checkPeer()`
2. **Replay Protection** - `SequenceReplayProtectionLib` prevents VAA reuse
3. **Role-Based Access** - Only PRICE_FEED_ROLE can call updatePrices
4. **Array Validation** - Lengths must match, no empty arrays
5. **No Value Forwarding** - Both contracts reject non-zero msg.value

## Common Operations

### Deploy with Verification

```bash
forge script script/DeployPriceFeedSender.s.sol:DeployPriceFeedSender \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $PRIVATE_KEY_SEPOLIA \
  --broadcast --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Manual Verification

```bash
forge verify-contract \
  --chain-id 11155111 \
  --constructor-args $(cast abi-encode "constructor(address,address)" <CORE_BRIDGE> <EXECUTOR>) \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  <CONTRACT_ADDRESS> \
  src/PriceFeedSender.sol:PriceFeedSender
```

### Query Price

```bash
cast call <CONTRACT_ADDRESS> "prices(string)" "bitcoin" --rpc-url <RPC>
```

### Setup Peers

```bash
# Run SetupPeers script on each chain
forge script script/SetupPeers.s.sol:SetupPeersScript \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Known Issues/Limitations

1. **Peer Format** - Must use correct Universal Address format (see Important Notes above)
2. **Executor Quotes** - Must fetch from Executor API (not hardcoded)
3. **Gas Estimation** - May need adjustment per chain for complex operations

## Dependencies

-   Wormhole Solidity SDK v0.1.0 (commit 115cc1e)
-   OpenZeppelin Contracts (AccessControl)
-   Forge-std (testing)
-   Solidity ^0.8.24

## Test Results

All 20 tests passing:

-   16 PriceFeed tests (deployment, roles, VAA reception, replay protection, etc.)
-   4 ChainIdHelper tests (mainnet, testnet, unsupported chains)

## File Structure

```
src/
  PriceFeedSender.sol      - Sender contract
  PriceFeedReceiver.sol    - Receiver contract
script/
  ChainIdHelper.sol        - Chain ID utility
  DeployPriceFeedSender.s.sol
  DeployPriceFeedReceiver.s.sol
  SetupPeers.s.sol
test/
  PriceFeed.t.sol         - Main test suite
  ChainIdHelper.t.sol     - Utility tests
e2e/                      - E2E TypeScript tests (not updated yet)
```

## Next Steps for Development

1. Update e2e tests for PriceFeed contracts (currently still HelloWormhole)
2. Add Executor quote integration (currently using empty bytes)
3. Add price staleness checks
4. Add price deviation limits
5. Consider adding price aggregation from multiple feeders

## References

-   Wormhole SDK: https://github.com/wormhole-foundation/wormhole-solidity-sdk
-   Wormhole Docs: https://wormhole.com/docs
-   Chain Constants: lib/wormhole-solidity-sdk/src/testing/ChainConsts.sol
-   Wormhole Chain IDs: lib/wormhole-solidity-sdk/src/constants/Chains.sol
