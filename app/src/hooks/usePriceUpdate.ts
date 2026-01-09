/**
 * Hook to submit price updates
 */

import { useState, useCallback } from 'react';
import {
    useWriteContract,
    useWaitForTransactionReceipt,
    useReadContract,
    usePublicClient,
    useAccount,
    useSwitchChain,
} from 'wagmi';
import { toast } from 'sonner';
import { parseUnits, formatEther } from 'viem';
import {
    getContractAddress,
    PRICE_FEED_SENDER_ABI,
    CORE_BRIDGE_ABI,
} from '@/lib/contracts';
import { SOURCE_CHAIN, DESTINATION_CHAINS, getWormholeChainId, getChainName, getEvmChainId } from '@/lib/chains';
import { getMultiChainQuotes, calculateTotalCost, pollForExecutorCompletion } from '@/lib/executor';
import { showProgressToast } from '@/lib/progressToast';
import type { TransactionStatus, PriceEntry } from '@/types';

// Sepolia CoreBridge address
const CORE_BRIDGE_ADDRESS = '0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78';

// Price decimals used in the contracts
const PRICE_DECIMALS = 6;

export function usePriceUpdate() {
    const { chainId } = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const publicClient = usePublicClient({ chainId: SOURCE_CHAIN.id });
    const [status, setStatus] = useState<TransactionStatus>({
        step: 'idle',
        destinationStatuses: {},
    });

    const { writeContractAsync, isPending: isWritePending } = useWriteContract();

    // Get message fee from CoreBridge
    const { data: messageFee } = useReadContract({
        address: CORE_BRIDGE_ADDRESS,
        abi: CORE_BRIDGE_ABI,
        functionName: 'messageFee',
        chainId: SOURCE_CHAIN.id,
    });

    const submitPriceUpdate = useCallback(
        async (entries: PriceEntry[]) => {
            if (entries.length === 0) {
                toast.error('Please add at least one price entry');
                return;
            }

            // Check if on correct chain
            if (chainId !== SOURCE_CHAIN.id) {
                toast.info(`Switching to ${getChainName(SOURCE_CHAIN.id)}...`);
                try {
                    await switchChainAsync({ chainId: SOURCE_CHAIN.id });
                } catch (error) {
                    toast.error(
                        'Please switch to Sepolia network to submit price updates'
                    );
                    return;
                }
            }

            setStatus({
                step: 'preparing',
                startTime: Date.now(),
                destinationStatuses: Object.fromEntries(
                    DESTINATION_CHAINS.map((c) => [c.id, 'pending'])
                ) as Record<number, 'pending' | 'complete' | 'failed'>,
            });

            try {
                // Prepare token names and prices (6 decimals for USDC-style pricing)
                const tokenNames = entries.map((e) => e.token);
                const prices = entries.map((e) => parseUnits(e.price, PRICE_DECIMALS));

                // Start progressive toast
                const progressToast = showProgressToast({
                    step: 1,
                    total: 4,
                    title: 'Getting relay quotes',
                    description: 'Fetching quotes from Executor API...',
                });

                // Get quotes for all destination chains
                const wormholeDestChains = DESTINATION_CHAINS.map((c) =>
                    getWormholeChainId(c.id)
                );
                const quotes = await getMultiChainQuotes(
                    getWormholeChainId(SOURCE_CHAIN.id),
                    wormholeDestChains
                );

                // Calculate total cost
                const fee = messageFee || BigInt(0);
                const executorCosts = quotes.map((q) => q.totalCost);
                const totalCost = calculateTotalCost(fee, executorCosts);

                // Prepare target chain params
                const targets = quotes.map((q) => ({
                    chainId: q.chainId,
                    gasLimit: q.gasLimit,
                    totalCost: q.totalCost,
                    signedQuote: q.signedQuote,
                }));

                setStatus((prev) => ({ ...prev, step: 'confirming' }));
                
                progressToast.update({
                    step: 2,
                    total: 4,
                    title: 'Ready to submit',
                    description: `Total cost: ${formatEther(totalCost)} ETH (includes gas for ${DESTINATION_CHAINS.length} chains). Please confirm in wallet...`,
                });

                // Submit transaction
                const hash = await writeContractAsync({
                    address: getContractAddress(SOURCE_CHAIN.id),
                    abi: PRICE_FEED_SENDER_ABI,
                    functionName: 'updatePrices',
                    args: [tokenNames, prices, targets],
                    value: totalCost,
                    chainId: SOURCE_CHAIN.id,
                });

                setStatus((prev) => ({ ...prev, hash, step: 'waiting-guardians' }));
                
                progressToast.update({
                    step: 3,
                    total: 4,
                    title: 'Transaction submitted',
                    description: 'Waiting for confirmation on Sepolia...',
                    txHash: hash,
                    chainId: SOURCE_CHAIN.id,
                });

                // Wait for transaction receipt
                const receipt = await publicClient?.waitForTransactionReceipt({
                    hash,
                });

                if (receipt?.status === 'success') {
                    setStatus((prev) => ({ ...prev, step: 'relaying' }));

                    // Update step 3 with confirmed status
                    progressToast.update({
                        step: 3,
                        total: 4,
                        title: 'Confirmed on Sepolia',
                        description: 'Transaction confirmed. Waiting for Wormhole Guardians to sign and relay...',
                        txHash: hash,
                        chainId: SOURCE_CHAIN.id,
                        wormholeScan: true,
                        executorExplorer: true,
                    });

                    // Poll for executor to complete the relay
                    try {
                        const expectedDestChains = DESTINATION_CHAINS.map((c) => getWormholeChainId(c.id));
                        const executorStatuses = await pollForExecutorCompletion(
                            hash,
                            expectedDestChains,
                            180000, // 3 minutes
                            5000 // 5 seconds
                        );

                        if (executorStatuses.length > 0) {
                            setStatus((prev) => ({
                                ...prev,
                                step: 'complete',
                                destinationStatuses: Object.fromEntries(
                                    DESTINATION_CHAINS.map((c) => [c.id, 'complete'])
                                ) as Record<number, 'pending' | 'complete' | 'failed'>,
                            }));

                            // Map destination transactions - convert Wormhole chain IDs to EVM chain IDs
                            const destinationTxs = executorStatuses.map(s => ({
                                chainId: getEvmChainId(s.chainId),
                                txHash: s.txHash,
                            }));

                            progressToast.update({
                                step: 4,
                                total: 4,
                                title: 'Complete!',
                                description: `Prices successfully relayed to ${DESTINATION_CHAINS.length} chains`,
                                txHash: hash,
                                chainId: SOURCE_CHAIN.id,
                                wormholeScan: true,
                                destinationTxs,
                            });
                        } else {
                            // Timeout or no status - still mark as relaying
                            setStatus((prev) => ({ ...prev, step: 'relaying' }));
                            progressToast.update({
                                step: 4,
                                total: 4,
                                title: 'Relaying in progress',
                                description: 'Transaction is being processed. Check Wormhole Scan for updates.',
                                txHash: hash,
                                chainId: SOURCE_CHAIN.id,
                                wormholeScan: true,
                                executorExplorer: true,
                            });
                        }
                    } catch (pollError) {
                        console.error('Error polling executor:', pollError);
                        // Don't fail the whole flow, just show partial status
                        progressToast.update({
                            step: 4,
                            total: 4,
                            title: 'Relay initiated',
                            description: 'Check Wormhole Scan or Executor Explorer for relay status',
                            txHash: hash,
                            chainId: SOURCE_CHAIN.id,
                            wormholeScan: true,
                            executorExplorer: true,
                        });
                    }

                    // Reset status after a delay so button re-enables
                    setTimeout(() => {
                        setStatus({ step: 'idle', destinationStatuses: {} });
                    }, 5000);
                } else {
                    throw new Error('Transaction failed');
                }
            } catch (error: any) {
                console.error('Price update error:', error);
                setStatus((prev) => ({
                    ...prev,
                    step: 'failed',
                    error: error.message || 'Unknown error',
                }));

                // Provide user-friendly error messages
                if (error.message?.includes('User rejected')) {
                    toast.error('Transaction was rejected by user');
                } else if (error.message?.includes('insufficient funds')) {
                    toast.error(
                        'Insufficient funds. Please ensure you have enough ETH for gas and relay fees.'
                    );
                } else if (error.message?.includes('PRICE_FEED_ROLE')) {
                    toast.error(
                        'Access denied. You need PRICE_FEED_ROLE to submit price updates.'
                    );
                } else {
                    toast.error(`Transaction failed: ${error.message || 'Unknown error'}`);
                }

                // Reset status after 3 seconds so user can try again
                setTimeout(() => {
                    setStatus({ step: 'idle', destinationStatuses: {} });
                }, 3000);
            }
        },
        [chainId, switchChainAsync, writeContractAsync, publicClient, messageFee]
    );

    const reset = useCallback(() => {
        setStatus({
            step: 'idle',
            destinationStatuses: {},
        });
    }, []);

    return {
        submitPriceUpdate,
        status,
        reset,
        isLoading: isWritePending || status.step !== 'idle',
    };
}
