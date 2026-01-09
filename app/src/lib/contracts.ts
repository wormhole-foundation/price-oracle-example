/**
 * Contract addresses and ABIs for the frontend
 * Self-contained to avoid import path issues with Next.js
 */

import { type Address, type Abi } from 'viem';
import { sepolia, baseSepolia, polygonAmoy } from 'wagmi/chains';
import _PriceFeedSenderABI from './PriceFeedSender.abi.json';
import _PriceFeedReceiverABI from './PriceFeedReceiver.abi.json';

// Cast to Abi type for proper TypeScript support
export const PRICE_FEED_SENDER_ABI = _PriceFeedSenderABI as Abi;
export const PRICE_FEED_RECEIVER_ABI = _PriceFeedReceiverABI as Abi;

// CoreBridge ABI (minimal - just what we need)
export const CORE_BRIDGE_ABI = [
    {
        type: 'function',
        name: 'messageFee',
        inputs: [],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
    },
] as const;

// Pre-deployed test contract addresses (public testnet contracts)
export const TEST_CONTRACT_ADDRESSES: Record<number, Address> = {
    [sepolia.id]: '0x0fdD0907faeF10335b00e1676F7Fd54669855eB7',
    [baseSepolia.id]: '0xbBd81BcDC0bb81F2f5e0E2FA1005B24A1d1a18af',
    [polygonAmoy.id]: '0xaceE91e84463b1F11C6CaA064455E5B65F9dCE91',
};

// Contract addresses from environment variables, fallback to test addresses
export const CONTRACT_ADDRESSES: Record<number, Address> = {
    [sepolia.id]: (process.env.NEXT_PUBLIC_PRICE_FEED_SEPOLIA ||
        TEST_CONTRACT_ADDRESSES[sepolia.id]) as Address,
    [baseSepolia.id]: (process.env.NEXT_PUBLIC_PRICE_FEED_BASE_SEPOLIA ||
        TEST_CONTRACT_ADDRESSES[baseSepolia.id]) as Address,
    [polygonAmoy.id]: (process.env.NEXT_PUBLIC_PRICE_FEED_POLYGON_AMOY ||
        TEST_CONTRACT_ADDRESSES[polygonAmoy.id]) as Address,
};

export function getContractAddress(chainId: number): Address {
    return CONTRACT_ADDRESSES[chainId] || ('0x' as Address);
}
