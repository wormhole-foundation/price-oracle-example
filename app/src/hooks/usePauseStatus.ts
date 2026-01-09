/**
 * Hook to check pause status of contracts
 */

import { useReadContract } from 'wagmi';
import {
    getContractAddress,
    PRICE_FEED_SENDER_ABI,
    PRICE_FEED_RECEIVER_ABI,
} from '@/lib/contracts';
import { SOURCE_CHAIN } from '@/lib/chains';

export function usePauseStatus(chainId: number) {
    const isSource = chainId === SOURCE_CHAIN.id;
    const abi = isSource ? PRICE_FEED_SENDER_ABI : PRICE_FEED_RECEIVER_ABI;

    const { data, isLoading, error, refetch } = useReadContract({
        address: getContractAddress(chainId),
        abi,
        functionName: 'paused',
        chainId: chainId as 11155111 | 84532 | 80002,
        query: {
            refetchInterval: 30000,
        },
    });

    return {
        isPaused: data as boolean | undefined,
        isLoading,
        error,
        refetch,
    };
}
