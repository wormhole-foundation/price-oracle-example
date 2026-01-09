/**
 * Type definitions for Wormhole cross-chain integration
 */

import type { Network, Chain } from '@wormhole-foundation/sdk-base';
import type { ethers } from 'ethers';

export interface ChainConfig {
    chain: Chain;
    network: Network;
    rpcUrl?: string;
    privateKey: string;
    priceFeedAddress: string;
    wormholeChainId: number;
}

export interface ExecutorQuoteParams {
    srcChain: number;
    dstChain: number;
    relayInstructions?: string;
}

export interface ExecutorQuote {
    signedQuote: string;
    estimatedCost: bigint;
}

export interface ExecutorCapabilities {
    requestPrefixes: string[];
    gasDropOffLimit?: string;
    maxGasLimit?: string;
    maxMsgValue?: string;
}

export interface SendPriceUpdateResult {
    receipt: ethers.TransactionReceipt | null;
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
    signedQuote: string;
}
