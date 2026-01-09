/**
 * Hook to query prices from contracts
 * Uses useReadContracts for batch queries to reduce RPC calls
 */

import { useReadContract, useReadContracts } from 'wagmi';
import {
    getContractAddress,
    PRICE_FEED_SENDER_ABI,
    PRICE_FEED_RECEIVER_ABI,
} from '@/lib/contracts';
import { SOURCE_CHAIN } from '@/lib/chains';

export function usePrice(chainId: number, tokenName: string) {
    const isSource = chainId === SOURCE_CHAIN.id;
    const abi = isSource ? PRICE_FEED_SENDER_ABI : PRICE_FEED_RECEIVER_ABI;

    const { data, isLoading, error, refetch } = useReadContract({
        address: getContractAddress(chainId),
        abi,
        functionName: 'prices',
        args: [tokenName],
        chainId: chainId as 11155111 | 84532 | 80002,
        query: {
            enabled: !!tokenName && tokenName.trim() !== '',
            refetchInterval: 10000,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
            staleTime: 5000,
        },
    });

    return {
        price: data as bigint | undefined,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Batch query multiple token prices for a single chain
 * More efficient than individual usePrice calls
 */
export function usePrices(chainId: number, tokenNames: string[]) {
    const isSource = chainId === SOURCE_CHAIN.id;
    const abi = isSource ? PRICE_FEED_SENDER_ABI : PRICE_FEED_RECEIVER_ABI;
    const address = getContractAddress(chainId);

    const contracts = tokenNames
        .filter((name) => name && name.trim() !== '')
        .map((tokenName) => ({
            address,
            abi,
            functionName: 'prices' as const,
            args: [tokenName] as const,
            chainId: chainId as 11155111 | 84532 | 80002,
        }));

    const { data, isLoading, error, refetch } = useReadContracts({
        contracts,
        query: {
            enabled: contracts.length > 0,
            refetchInterval: 10000,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
            staleTime: 5000,
        },
    });

    // Convert to a map of token -> price
    const prices: Record<string, bigint | undefined> = {};
    const errors: Record<string, Error | null> = {};
    
    if (data) {
        tokenNames.forEach((token, index) => {
            if (data[index]?.status === 'success') {
                prices[token] = data[index].result as bigint;
            } else if (data[index]?.status === 'failure') {
                errors[token] = data[index].error as Error;
            }
        });
    }

    return {
        prices,
        errors,
        isLoading,
        error,
        refetch,
    };
}
