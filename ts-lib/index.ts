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
    getProviderAndWallet,
    getCoreBridgeAddress,
    sleep,
    pollForEvent,
    pollForVAA,
} from './wormhole';

// Cross-chain messaging
export {
    getPriceFeedContract,
    sendPriceUpdate,
    queryPrice,
    estimatePriceUpdateCost,
} from './messaging';

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
