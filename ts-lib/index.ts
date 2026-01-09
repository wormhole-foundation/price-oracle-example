/**
 * Shared TypeScript library for Wormhole cross-chain messaging
 *
 * This library provides reusable utilities for:
 * - Address conversion (EVM <-> Wormhole universal)
 * - Executor API interactions (quotes, status)
 * - Relay instructions creation
 * - Wormhole SDK context and chain utilities
 * - Cross-chain messaging (price feed updates)
 *
 * Now uses viem instead of ethers for all blockchain interactions.
 * No logging - suitable for both CLI and frontend usage
 */

// Address utilities
export { toUniversalAddress, fromUniversalAddress } from './address';

// Relay instructions
export {
    DEFAULT_GAS_LIMIT,
    DEFAULT_MSG_VALUE,
    createRelayInstructions,
} from './relay';

// Executor API
export {
    getExecutorApiUrl,
    getExecutorCapabilities,
    getExecutorQuote,
    getMultiChainQuotes,
    checkTransactionStatus,
    pollForExecutorStatus,
    calculateTotalCost,
} from './executor';

// Wormhole SDK utilities
export {
    getWormholeContext,
    getViemChain,
    getPublicClient,
    getWalletClient,
    getClients,
    getCoreBridgeAddress,
    sleep,
    pollForEvent,
    pollForVAA,
} from './wormhole';

// Cross-chain messaging
export {
    PriceFeedSenderABI,
    PriceFeedReceiverABI,
    CoreBridgeABI,
    getPriceFeedContract,
    sendPriceUpdate,
    queryPrice,
    estimatePriceUpdateCost,
} from './messaging';

// ABIs (re-export from config for convenience)
export {
    PriceFeedSenderABI as PRICE_FEED_SENDER_ABI,
    PriceFeedReceiverABI as PRICE_FEED_RECEIVER_ABI,
    CoreBridgeABI as CORE_BRIDGE_ABI,
} from '../config/abi';

// Re-export types
export type {
    ChainConfig,
    ExecutorQuoteParams,
    ExecutorQuote,
    ExecutorCapabilities,
    SendPriceUpdateResult,
    VAAData,
    TargetChainParams,
} from '../config/types';
