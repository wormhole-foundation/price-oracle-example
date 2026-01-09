/**
 * Price display component for showing token prices
 * Uses batched queries for better performance
 */

'use client';

import { formatUnits } from 'viem';
import { usePrices } from '@/hooks/usePrices';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Price decimals used in the contracts
const PRICE_DECIMALS = 6;

interface PriceDisplayProps {
    chainId: number;
    tokens: string[];
    onRemoveToken?: (token: string) => void;
}

export function PriceDisplay({ chainId, tokens, onRemoveToken }: PriceDisplayProps) {
    // Use batched query for all tokens at once (single RPC call)
    const { prices, errors, isLoading } = usePrices(chainId, tokens);

    if (tokens.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground text-sm">
                No tokens tracked yet. Add a token in the form below.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {tokens.map((token) => (
                <PriceRow
                    key={token}
                    token={token}
                    price={prices[token]}
                    error={errors[token]}
                    isLoading={isLoading}
                    onRemove={onRemoveToken}
                />
            ))}
        </div>
    );
}

interface PriceRowProps {
    token: string;
    price: bigint | undefined;
    error: Error | null | undefined;
    isLoading: boolean;
    onRemove?: (token: string) => void;
}

function PriceRow({ token, price, error, isLoading, onRemove }: PriceRowProps) {
    const displayPrice = () => {
        if (isLoading) {
            return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
        }

        // Show loading state for network errors (wagmi retries automatically)
        if (error) {
            const errorMessage = error.message?.toLowerCase() || '';
            const isNetworkError = errorMessage.includes('fetch') || 
                                   errorMessage.includes('network') ||
                                   errorMessage.includes('timeout');
            if (isNetworkError) {
                return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
            }
            return <span className="text-destructive text-sm">Error</span>;
        }

        // Show N/A for prices that haven't been set
        if (price === undefined || price === BigInt(0)) {
            return <span className="text-muted-foreground text-sm">N/A</span>;
        }

        // Format price using 6 decimals
        const formatted = formatUnits(price, PRICE_DECIMALS);
        const num = parseFloat(formatted);
        
        // Format as USD currency
        return (
            <span className="font-mono text-[#14F195]">
                ${num.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                })}
            </span>
        );
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
            <div className="flex items-center gap-2">
                <Badge
                    variant="outline"
                    className="border-[#9945FF] text-[#9945FF]"
                >
                    {token}
                </Badge>
            </div>
            <div className="flex items-center gap-2">
                {displayPrice()}
                {onRemove && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemove(token)}
                    >
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                )}
            </div>
        </div>
    );
}
