/**
 * Connect wallet button using AppKit
 */

'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAccount, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { SOURCE_CHAIN, getChainName } from '@/lib/chains';

export function ConnectButton() {
    const { open } = useAppKit();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();

    if (isConnected && address) {
        const isWrongChain = chainId !== SOURCE_CHAIN.id;

        return (
            <div className="flex items-center gap-3">
                {isWrongChain && (
                    <span className="text-sm text-yellow-400">
                        ⚠️ Switch to {getChainName(SOURCE_CHAIN.id)}
                    </span>
                )}
                <Button
                    variant="outline"
                    onClick={() => open()}
                    className="border-[#9945FF] text-[#9945FF] hover:bg-[#9945FF]/10 font-mono"
                >
                    <div
                        className={`h-2 w-2 rounded-full mr-2 ${
                            isWrongChain ? 'bg-yellow-400' : 'bg-[#14F195]'
                        }`}
                    />
                    {address.slice(0, 6)}...{address.slice(-4)}
                </Button>
            </div>
        );
    }

    return (
        <Button
            onClick={() => open()}
            className="bg-[#9945FF] hover:bg-[#7B35CC] text-white"
        >
            Connect Wallet
        </Button>
    );
}
