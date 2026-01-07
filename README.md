# Cross-Chain Price Feed Oracle

A production-ready cross-chain price feed oracle built with Wormhole's Executor architecture. Send multiple token price updates between chains in a single transaction with automatic relay.

> **License Reminder**
>
> The code is provided on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
>
> Make sure you check/audit any code before deploying to mainnet.

## Features

✅ **Array-Based Price Updates** - Send 1 or many prices in a single message  
✅ **Split Architecture** - Separate sender (Sepolia) and receiver (Monad) contracts  
✅ **Role-Based Access** - PRICE_FEED_ROLE for authorized price feeders  
✅ **Peer Validation** - Only accept messages from authorized senders  
✅ **Replay Protection** - Prevent duplicate VAA execution  
✅ **Fork Testing** - Comprehensive test suite with VAA crafting  
✅ **Deployment Scripts** - Ready-to-use scripts with verification support

## Quick Start

```bash
# Install dependencies
forge install
npm install

# Run tests
forge test

# Deploy to Sepolia (sender)
forge script script/DeployPriceFeedSender.s.sol:DeployPriceFeedSender \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $PRIVATE_KEY_SEPOLIA \
  --broadcast --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Deploy to Base Sepolia (receiver)
forge script script/DeployPriceFeedReceiver.s.sol:DeployPriceFeedReceiver \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY_BASE_SEPOLIA \
  --broadcast --verify \
  --basescan-api-key $BASESCAN_API_KEY
```

## Architecture

### Contracts

**PriceFeedSender.sol** (Deploy on Sepolia)

-   Receives price updates from authorized feeders (PRICE_FEED_ROLE)
-   Stores prices locally: `mapping(string => uint256) public prices`
-   Sends cross-chain messages via Wormhole Executor
-   Supports array-based updates (1 to many tokens per transaction)

**PriceFeedReceiver.sol** (Deploy on Base Sepolia)

-   Receives cross-chain price updates
-   Validates sender peer address
-   Stores received prices locally
-   Emits `PricesReceived` event

**ChainIdHelper.sol** (Utility)

-   Converts EVM chain IDs to Wormhole chain IDs
-   Supports 40+ chains including Sepolia, Monad, Base, etc.

### Chain Configuration

| Chain            | Role     | EVM Chain ID | Wormhole Chain ID | CoreBridge                                   | Executor                                     |
| ---------------- | -------- | ------------ | ----------------- | -------------------------------------------- | -------------------------------------------- |
| **Sepolia**      | Sender   | `11155111`   | `10002`           | `0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78` | `0xD0fb39f5a3361F21457653cB70F9D0C9bD86B66B` |
| **Base Sepolia** | Receiver | `84532`      | `10004`           | `0x79A1027a6A159502049F10906D333EC57E95F083` | `0x51B47D493CBA7aB97e3F8F163D6Ce07592CE4482` |

## Installation

**Solidity Dependencies:**

```bash
forge install
```

**TypeScript/Node Dependencies (for E2E tests):**

```bash
npm install
```

## Deployment

### 1. Setup Environment

Create `.env` file in project root:

```bash
# Private keys (use test wallets only!)
PRIVATE_KEY_SEPOLIA=0xYourSepoliaPrivateKey
PRIVATE_KEY_BASE_SEPOLIA=0xYourBaseSepoliaPrivateKey

# API keys for verification
ETHERSCAN_API_KEY=your_etherscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
```

### 2. Deploy Sender (Sepolia)

```bash
source .env

forge script script/DeployPriceFeedSender.s.sol:DeployPriceFeedSender \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $PRIVATE_KEY_SEPOLIA \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvv
```

**Save the deployed address!** Example output:

```
PriceFeedSender deployed at: 0x1234...
CoreBridge: 0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78
Executor: 0xD0fb39f5a3361F21457653cB70F9D0C9bD86B66B
```

### 3. Deploy Receiver (Base Sepolia)

```bash
forge script script/DeployPriceFeedReceiver.s.sol:DeployPriceFeedReceiver \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY_BASE_SEPOLIA \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvv
```

### 4. Setup Peer Connections

After deploying both contracts, configure them to trust each other:

```bash
# Set Base Sepolia receiver as peer on Sepolia sender
cast send <SENDER_ADDRESS> \
  "setPeer(uint16,bytes32)" \
  10004 \
  $(cast --to-bytes32 <RECEIVER_ADDRESS>) \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $PRIVATE_KEY_SEPOLIA

# Set Sepolia sender as peer on Base Sepolia receiver
cast send <RECEIVER_ADDRESS> \
  "setPeer(uint16,bytes32)" \
  10002 \
  $(cast --to-bytes32 <SENDER_ADDRESS>) \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY_BASE_SEPOLIA
```

### 5. Verification (If Needed)

If automatic verification fails, verify manually:

```bash
# For Sepolia sender
forge verify-contract \
  --chain-id 11155111 \
  --constructor-args $(cast abi-encode "constructor(address,address)" <CORE_BRIDGE> <EXECUTOR>) \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --watch \
  <SENDER_ADDRESS> \
  src/PriceFeedSender.sol:PriceFeedSender

# For Base Sepolia receiver
forge verify-contract \
  --chain-id 84532 \
  --constructor-args $(cast abi-encode "constructor(address)" <CORE_BRIDGE>) \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch \
  <RECEIVER_ADDRESS> \
  src/PriceFeedReceiver.sol:PriceFeedReceiver
```

## Usage

### Update Prices

Send a batch of price updates:

```bash
# Update multiple prices in one transaction
cast send <SENDER_ADDRESS> \
  "updatePrices(string[],uint256[],uint16,uint128,uint256,bytes)" \
  '["bitcoin","ethereum","solana"]' \
  '[4500000000000,250000000000,10000000000]' \
  10004 \
  500000 \
  0.01ether \
  '0x' \
  --value 0.01ether \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $PRIVATE_KEY_SEPOLIA
```

For a single price, use 1-element arrays:

```bash
cast send <SENDER_ADDRESS> \
  "updatePrices(string[],uint256[],uint16,uint128,uint256,bytes)" \
  '["bitcoin"]' \
  '[4500000000000]' \
  10004 \
  500000 \
  0.01ether \
  '0x' \
  --value 0.01ether \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $PRIVATE_KEY_SEPOLIA
```

### Query Prices

Check prices on either chain:

```bash
# On Sepolia (sender)
cast call <SENDER_ADDRESS> "prices(string)" "bitcoin" \
  --rpc-url https://ethereum-sepolia.publicnode.com

# On Base Sepolia (receiver) - wait ~15-30 seconds for cross-chain delivery
cast call <RECEIVER_ADDRESS> "prices(string)" "bitcoin" \
  --rpc-url https://sepolia.base.org
```

### Grant Price Feed Role

Allow other addresses to update prices:

```bash
# Calculate role hash
PRICE_FEED_ROLE=$(cast keccak "PRICE_FEED_ROLE")

# Grant role
cast send <SENDER_ADDRESS> \
  "grantRole(bytes32,address)" \
  $PRICE_FEED_ROLE \
  <FEEDER_ADDRESS> \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $PRIVATE_KEY_SEPOLIA
```

## Testing

Run all tests (20 tests total):

```bash
forge test
```

Run specific test suite:

```bash
# Price feed tests
forge test --match-contract PriceFeedTest -vvv

# Chain ID helper tests
forge test --match-contract ChainIdHelperTest -vvv
```

Run single test with verbose output:

```bash
forge test --match-test test_BatchPriceUpdate -vvvv
```

### Test Coverage

-   ✅ Deployment on both chains
-   ✅ Role-based access control
-   ✅ Peer setup and validation
-   ✅ Single and batch price updates
-   ✅ Cross-chain VAA reception
-   ✅ Replay protection
-   ✅ Invalid peer rejection
-   ✅ Price overwrites
-   ✅ Chain ID conversions (40+ chains)

## Contract API

### PriceFeedSender

```solidity
// Update prices (1 or many tokens)
function updatePrices(
    string[] calldata tokenNames,
    uint256[] calldata pricesArray,
    uint16 targetChain,
    uint128 gasLimit,
    uint256 totalCost,
    bytes calldata signedQuote
) external payable returns (uint64 sequence)

// Query price
mapping(string => uint256) public prices;

// Manage peers
function setPeer(uint16 chainId, bytes32 peerAddress) external
```

### PriceFeedReceiver

```solidity
// Automatically receives via executeVAAv1(bytes)

// Query price
mapping(string => uint256) public prices;

// Manage peers
function setPeer(uint16 chainId, bytes32 peerAddress) external
```

### ChainIdHelper

```solidity
// Convert EVM chain ID to Wormhole chain ID
function toWormholeChainId(uint256 evmChainId) internal pure returns (uint16)

// Check if chain is supported
function isSupported(uint256 evmChainId) internal pure returns (bool)
```

## Security Features

1. **Peer Validation** - Receiver only accepts messages from authorized sender
2. **Replay Protection** - Sequence-based protection prevents duplicate execution
3. **Role-Based Access** - Only PRICE_FEED_ROLE can update prices
4. **Array Validation** - Ensures tokenNames and prices arrays match in length
5. **Empty Array Check** - Prevents gas waste on empty updates

## Building Your Own Executor Integration

Want to build a different cross-chain app? Here's the pattern:

### 1. Choose Your Base Contract

```solidity
import {ExecutorSend} from "wormhole-solidity-sdk/Executor/Integration.sol";
import {ExecutorReceive} from "wormhole-solidity-sdk/Executor/Integration.sol";

// Send only (e.g., lock contract on source chain)
contract MyLocker is ExecutorSend {
    constructor(address coreBridge, address executor)
        ExecutorSend(coreBridge, executor) {}
}

// Receive only (e.g., unlock contract on dest chain)
contract MyUnlocker is ExecutorReceive {
    constructor(address coreBridge)
        ExecutorReceive(coreBridge) {}
}
```

### 2. Implement Required Functions

```solidity
// Store trusted peer addresses
mapping(uint16 => bytes32) internal peers;

function _getPeer(uint16 chainId) internal view override returns (bytes32) {
    return peers[chainId];
}

// Implement replay protection
function _replayProtect(
    uint16 emitterChainId,
    bytes32 emitterAddress,
    uint64 sequence,
    bytes calldata
) internal override {
    SequenceReplayProtectionLib.replayProtect(emitterChainId, emitterAddress, sequence);
}

// Handle incoming messages
function _executeVaa(
    bytes calldata payload,
    uint32, uint16 peerChain, bytes32 peerAddress, uint64, uint8
) internal override {
    // Your business logic here
    // Decode payload and process
}
```

### 3. Send Messages

```solidity
function sendCrossChain(bytes memory payload, uint16 targetChain) external payable {
    uint64 sequence = _publishAndRelay(
        payload,
        200,              // consistency level (finalized)
        totalCost,        // executor fee + message fee
        targetChain,
        msg.sender,       // refund address
        signedQuote,      // from Executor pricing API
        gasLimit,
        0,                // msg.value to forward
        ""                // relay instructions
    );
}
```

## Troubleshooting

### Transaction Reverts

```bash
# Check if you have PRICE_FEED_ROLE
cast call <SENDER_ADDRESS> "hasRole(bytes32,address)" \
  $(cast keccak "PRICE_FEED_ROLE") <YOUR_ADDRESS> \
  --rpc-url https://ethereum-sepolia.publicnode.com

# Check if peer is set
cast call <SENDER_ADDRESS> "peers(uint16)" 48 \
  --rpc-url https://ethereum-sepolia.publicnode.com
```

### Price Not Received on Monad

-   Wait 15-30 seconds for cross-chain message delivery
-   Check Wormhole explorer: https://wormholescan.io/#/txs?sourceChain=10002&address=<SENDER_ADDRESS>
-   Verify peer is configured on receiver

### Verification Failed

Some chains don't support Etherscan verification. For Monad, verification may not be available yet on testnet.

## Resources

-   [Wormhole Docs](https://wormhole.com/docs)
-   [Solidity SDK](https://github.com/wormhole-foundation/wormhole-solidity-sdk)
-   [Executor Documentation](https://wormhole.com/docs/build/contract-integrations/core-contracts/#executor)
-   [Wormhole Scanner](https://wormholescan.io)

## License

MIT
