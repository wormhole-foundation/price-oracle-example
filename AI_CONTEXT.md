# AI Agent Context - Cross-Chain Price Feed Oracle

This document provides complete context for AI agents working with this codebase.

## Project Overview

Cross-chain price feed oracle using Wormhole Executor architecture. Sends token prices from Sepolia to Base Sepolia.

## Key Files

### Contracts

-   `src/PriceFeedSender.sol` - Sender contract (Sepolia), extends ExecutorSend
-   `src/PriceFeedReceiver.sol` - Receiver contract (Base Sepolia), extends ExecutorReceive
-   `script/ChainIdHelper.sol` - Utility library for EVM ↔ Wormhole chain ID conversion

### Tests

-   `test/PriceFeed.t.sol` - 16 comprehensive tests with fork testing and VAA crafting
-   `test/ChainIdHelper.t.sol` - 4 tests for chain ID utility

### Deployment

-   `script/DeployPriceFeedSender.s.sol` - Deploy sender to Sepolia with verification
-   `script/DeployPriceFeedReceiver.s.sol` - Deploy receiver to Base Sepolia with verification
-   `script/SetupPeers.s.sol` - Configure peer relationships

## Architecture Decisions

### Why Separate Sender/Receiver?

1. **Gas Optimization** - Smaller contract size per chain
2. **Clear Separation** - Sender has PRICE_FEED_ROLE, receiver validates peers
3. **Security** - Each contract only has the permissions it needs

### Why Array-Based Only?

-   Simplified from dual format (single + batch) to array-only
-   For single price: use 1-element array
-   Benefits: simpler code, no backward compatibility logic, cleaner events

### Why Sepolia and Base Sepolia?

Both are established Ethereum testnets with full Wormhole support. Base Sepolia provides L2 scalability for the receiver while Sepolia serves as the L1 sender.

## Important Constants

### Wormhole Chain IDs

-   Sepolia: `10002` (EVM: `11155111`)
-   Base Sepolia: `10004` (EVM: `84532`)

### Contract Addresses

**Sepolia:**

-   CoreBridge: `0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78`
-   Executor: `0xD0fb39f5a3361F21457653cB70F9D0C9bD86B66B`

**Base Sepolia:**

-   CoreBridge: `0x79A1027a6A159502049F10906D333EC57E95F083`
-   Executor: `0x51B47D493CBA7aB97e3F8F163D6Ce07592CE4482`

## Function Signatures

### PriceFeedSender

```solidity
function updatePrices(
    string[] calldata tokenNames,
    uint256[] calldata pricesArray,
    uint16 targetChain,
    uint128 gasLimit,
    uint256 totalCost,
    bytes calldata signedQuote
) external payable onlyRole(PRICE_FEED_ROLE) returns (uint64 sequence)

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

-   `PricesUpdated(uint256 count, uint16 targetChain, uint64 sequence)`
-   `LocalPricesStored(string[] tokenNames, uint256[] prices)`

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

1. Deploy PriceFeedSender on Sepolia
2. Deploy PriceFeedReceiver on Base Sepolia
3. Set receiver as peer on sender: `setPeer(10004, receiverAddress)`
4. Set sender as peer on receiver: `setPeer(10002, senderAddress)`
5. Grant PRICE_FEED_ROLE to authorized feeders

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

### Update Price

```bash
cast send <SENDER_ADDRESS> \
  "updatePrices(string[],uint256[],uint16,uint128,uint256,bytes)" \
  '["bitcoin"]' '[4500000000000]' 48 500000 0.01ether '0x' \
  --value 0.01ether --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $PRIVATE_KEY_SEPOLIA
```

## Known Issues/Limitations

1. **Monad Verification** - Testnet may not have block explorer for contract verification
2. **Executor Fees** - Must get signedQuote from Executor API off-chain (simplified with '0x' in examples)
3. **Fork Testing** - Tests still use Base Sepolia fork (not Monad) due to RPC availability

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
