/**
 * Hook to check if user has admin roles
 */

import { useReadContracts, useAccount } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import {
    getContractAddress,
    PRICE_FEED_SENDER_ABI,
    PRICE_FEED_RECEIVER_ABI,
} from '@/lib/contracts';
import { SOURCE_CHAIN, DESTINATION_CHAINS } from '@/lib/chains';

export function useAdminRole() {
    const { address, isConnected } = useAccount();

    // Get role hashes from sender contract
    const { data: roleHashes } = useReadContracts({
        contracts: [
            {
                address: getContractAddress(SOURCE_CHAIN.id),
                abi: PRICE_FEED_SENDER_ABI,
                functionName: 'PRICE_FEED_ROLE',
                chainId: SOURCE_CHAIN.id,
            },
            {
                address: getContractAddress(SOURCE_CHAIN.id),
                abi: PRICE_FEED_SENDER_ABI,
                functionName: 'DEFAULT_ADMIN_ROLE',
                chainId: SOURCE_CHAIN.id,
            },
        ],
        query: {
            enabled: isConnected,
        },
    });

    const priceFeedRole = roleHashes?.[0]?.result;
    const defaultAdminRole = roleHashes?.[1]?.result;

    // Check roles on sender contract
    const { data: senderRoles, isLoading: senderLoading } = useReadContracts({
        contracts: [
            {
                address: getContractAddress(SOURCE_CHAIN.id),
                abi: PRICE_FEED_SENDER_ABI,
                functionName: 'hasRole',
                args: [priceFeedRole!, address!],
                chainId: SOURCE_CHAIN.id,
            },
            {
                address: getContractAddress(SOURCE_CHAIN.id),
                abi: PRICE_FEED_SENDER_ABI,
                functionName: 'hasRole',
                args: [defaultAdminRole!, address!],
                chainId: SOURCE_CHAIN.id,
            },
        ],
        query: {
            enabled: isConnected && !!address && !!priceFeedRole && !!defaultAdminRole,
        },
    });

    // Check admin roles on receiver contracts
    const { data: receiverRoles, isLoading: receiverLoading } = useReadContracts({
        contracts: DESTINATION_CHAINS.flatMap((chain) => [
            {
                address: getContractAddress(chain.id),
                abi: PRICE_FEED_RECEIVER_ABI,
                functionName: 'hasRole',
                args: [defaultAdminRole!, address!],
                chainId: chain.id,
            },
        ]),
        query: {
            enabled: isConnected && !!address && !!defaultAdminRole,
        },
    });

    const hasPriceFeedRole = senderRoles?.[0]?.result === true;
    const hasSenderAdminRole = senderRoles?.[1]?.result === true;

    const receiverAdminStatus: Record<number, boolean> = {};
    DESTINATION_CHAINS.forEach((chain, index) => {
        receiverAdminStatus[chain.id] = receiverRoles?.[index]?.result === true;
    });

    return {
        isConnected,
        address,
        hasPriceFeedRole,
        hasSenderAdminRole,
        isSenderAdmin: hasPriceFeedRole || hasSenderAdminRole,
        receiverAdminStatus,
        isLoading: senderLoading || receiverLoading,
    };
}
