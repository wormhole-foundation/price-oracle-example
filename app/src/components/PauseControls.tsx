/**
 * Pause/Unpause controls for admin users
 */

'use client';

import { useWriteContract, useSwitchChain, useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    getContractAddress,
    PRICE_FEED_SENDER_ABI,
    PRICE_FEED_RECEIVER_ABI,
} from '@/lib/contracts';
import { SOURCE_CHAIN, getChainName } from '@/lib/chains';
import { usePauseStatus } from '@/hooks/usePauseStatus';

interface PauseControlsProps {
    chainId: number;
    isAdmin: boolean;
}

export function PauseControls({ chainId, isAdmin }: PauseControlsProps) {
    const { chainId: currentChainId } = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const { isPaused, isLoading, refetch } = usePauseStatus(chainId);
    const { writeContractAsync, isPending } = useWriteContract();

    const isSource = chainId === SOURCE_CHAIN.id;
    const abi = isSource ? PRICE_FEED_SENDER_ABI : PRICE_FEED_RECEIVER_ABI;

    const handlePauseToggle = async () => {
        if (!isAdmin) {
            toast.error('You do not have admin permissions on this contract');
            return;
        }

        // Check if need to switch chains
        if (currentChainId !== chainId) {
            toast.info(`Switching to ${getChainName(chainId)}...`);
            try {
                await switchChainAsync({ chainId: chainId as 11155111 | 84532 | 80002 });
            } catch (error) {
                toast.error(`Please switch to ${getChainName(chainId)} to manage this contract`);
                return;
            }
        }

        try {
            const action = isPaused ? 'unpause' : 'pause';
            toast.info(`Please confirm the ${action} transaction...`);

            await writeContractAsync({
                address: getContractAddress(chainId),
                abi,
                functionName: action,
                chainId: chainId as 11155111 | 84532 | 80002,
            });

            toast.success(`Contract ${action}d successfully!`);
            refetch();
        } catch (error: any) {
            if (error.message?.includes('User rejected')) {
                toast.error('Transaction was rejected');
            } else {
                toast.error(`Failed to toggle pause: ${error.message}`);
            }
        }
    };

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <Button
                variant={isPaused ? 'default' : 'destructive'}
                size="sm"
                onClick={handlePauseToggle}
                disabled={isPending || isLoading}
                className={
                    isPaused
                        ? 'bg-[#14F195] text-black hover:bg-[#10C777]'
                        : ''
                }
            >
                {isPending ? 'Processing...' : isPaused ? 'Unpause' : 'Pause'}
            </Button>
        </div>
    );
}
