/**
 * Relay configuration and utilities for Wormhole Executor
 * Browser-compatible - no SDK imports with side effects
 */

import type { Hex } from 'viem';

/**
 * Default gas limit for receiving messages on the target chain
 * Based on successful test runs for simple message delivery
 */
export const DEFAULT_GAS_LIMIT = 171948n;

/**
 * Default msg.value for relay instructions (no native token forwarding)
 */
export const DEFAULT_MSG_VALUE = 0n;

/**
 * Executor API URLs by network (with /v0 path included)
 * Source: https://github.com/wormhole-foundation/wormhole-sdk-ts/blob/main/core/base/src/constants/executor.ts
 */
export const EXECUTOR_API_URLS = {
    Mainnet: 'https://executor.labsapis.com/v0',
    Testnet: 'https://executor-testnet.labsapis.com/v0',
    Devnet: 'https://executor-testnet.labsapis.com/v0', // No devnet executor
} as const;

export type NetworkType = keyof typeof EXECUTOR_API_URLS;

/**
 * Get the Executor API URL for a network (browser-compatible, no SDK import)
 */
export function getExecutorApiUrl(network: NetworkType = 'Testnet'): string {
    return EXECUTOR_API_URLS[network];
}

/**
 * Create relay instructions for the Executor quote request
 *
 * Relay instructions tell the Executor:
 * - How much gas to provide when calling _executeVaa on the target chain
 * - How much native token (msg.value) to forward (typically 0 for this use case)
 *
 * Format: 0x01 (version byte) + uint128 gasLimit (16 bytes) + uint128 msgValue (16 bytes)
 */
export function createRelayInstructions(
    gasLimit: bigint = DEFAULT_GAS_LIMIT,
    msgValue: bigint = DEFAULT_MSG_VALUE
): Hex {
    // Version byte 0x01 for relay instructions format
    const version = '01';

    // Encode as uint128 (16 bytes each, big-endian)
    const gasLimitHex = gasLimit.toString(16).padStart(32, '0');
    const msgValueHex = msgValue.toString(16).padStart(32, '0');

    return ('0x' + version + gasLimitHex + msgValueHex) as Hex;
}

/**
 * Calculate total cost including message fee
 * Accepts either a single bigint or array of executor costs
 */
export function calculateTotalCost(
    messageFee: bigint,
    executorCost: bigint | bigint[]
): bigint {
    const totalExecutorCost = Array.isArray(executorCost)
        ? executorCost.reduce((sum, cost) => sum + cost, BigInt(0))
        : executorCost;
    return messageFee + totalExecutorCost;
}
