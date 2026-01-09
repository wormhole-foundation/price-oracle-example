/**
 * Contract ABIs - Central source of truth for all contract interfaces
 * 
 * These ABIs are imported from the compiled Solidity contracts.
 * Used by both e2e tests and the frontend.
 */

import type { Abi } from 'viem';
import _PriceFeedSenderABI from './PriceFeedSender.abi.json' with { type: 'json' };
import _PriceFeedReceiverABI from './PriceFeedReceiver.abi.json' with { type: 'json' };

// Cast to Abi type for proper TypeScript support
export const PriceFeedSenderABI = _PriceFeedSenderABI as Abi;
export const PriceFeedReceiverABI = _PriceFeedReceiverABI as Abi;

/**
 * CoreBridge ABI (minimal - just what we need)
 */
export const CoreBridgeABI = [
    {
        type: 'function',
        name: 'messageFee',
        inputs: [],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
    },
] as const;
