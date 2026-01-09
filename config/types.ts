/**
 * Type definitions for Wormhole cross-chain integration
 */

import type { Network, Chain } from '@wormhole-foundation/sdk-base';
import type { Hash, TransactionReceipt, Address, Hex } from 'viem';

export interface ChainConfig {
    chain: Chain;
    network: Network;
    rpcUrl?: string;
    privateKey: Hex;
    priceFeedAddress: Address;
    wormholeChainId: number;
}

export interface ExecutorQuoteParams {
    srcChain: number;
    dstChain: number;
    relayInstructions?: string;
}

export interface ExecutorQuote {
    signedQuote: Hex;
    estimatedCost: bigint;
}

export interface ExecutorCapabilities {
    requestPrefixes: string[];
    gasDropOffLimit?: string;
    maxGasLimit?: string;
    maxMsgValue?: string;
}

export interface SendPriceUpdateResult {
    receipt: TransactionReceipt | null;
    hash: Hash | undefined;
    sequence: bigint | undefined;
}

export interface VAAData {
    vaa: string;
    timestamp: string;
}

export interface TargetChainParams {
    chainId: number;
    gasLimit: bigint;
    totalCost: bigint;
    signedQuote: Hex;
}
