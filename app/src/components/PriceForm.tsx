/**
 * Price submission form for admins
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePriceUpdate } from '@/hooks/usePriceUpdate';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useTrackedTokens } from '@/hooks/useTrackedTokens';
import type { PriceEntry } from '@/types';
import { Plus, Trash2, Send } from 'lucide-react';

// Format number with commas for display
function formatCurrency(value: string): string {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    // Format with commas, preserve decimals as entered
    const parts = value.split('.');
    const intPart = parseInt(parts[0] || '0', 10).toLocaleString('en-US');
    if (parts.length > 1) {
        return intPart + '.' + parts[1];
    }
    return intPart;
}

// Parse currency string - remove $ and commas, keep numbers and decimal
function parseCurrency(value: string): string {
    return value.replace(/[$,]/g, '');
}

// Validate input - only allow numbers and one decimal point
function sanitizePriceInput(value: string): string {
    // Remove everything except digits and decimal point
    let sanitized = value.replace(/[^0-9.]/g, '');
    // Only allow one decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
        sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
    return sanitized;
}

interface PriceFormProps {
    onTokensAdded?: (tokens: string[]) => void;
}

export function PriceForm({ onTokensAdded }: PriceFormProps) {
    const { isSenderAdmin, isConnected } = useAdminRole();
    const { submitPriceUpdate, isLoading, status } = usePriceUpdate();
    const { addToken } = useTrackedTokens();
    const [entries, setEntries] = useState<PriceEntry[]>([
        { token: '', price: '' },
    ]);
    const [focusedPriceIndex, setFocusedPriceIndex] = useState<number | null>(null);

    const addEntry = () => {
        setEntries([...entries, { token: '', price: '' }]);
    };

    const removeEntry = (index: number) => {
        if (entries.length > 1) {
            setEntries(entries.filter((_, i) => i !== index));
        }
    };

    const updateEntry = (
        index: number,
        field: keyof PriceEntry,
        value: string
    ) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Filter valid entries
        const validEntries = entries.filter(
            (e) => e.token.trim() !== '' && e.price.trim() !== ''
        );

        if (validEntries.length === 0) {
            return;
        }

        // Add tokens via hook (handles localStorage and React Query cache)
        const tokens = validEntries.map((e) => e.token.trim());
        tokens.forEach(addToken);
        onTokensAdded?.(tokens);

        await submitPriceUpdate(validEntries);

        // Clear form on success
        if (status.step === 'complete') {
            setEntries([{ token: '', price: '' }]);
        }
    };

    if (!isConnected) {
        return (
            <Card className="border-border bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg">Submit Price Update</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Connect your wallet to submit price updates
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!isSenderAdmin) {
        return (
            <Card className="border-border bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg">Submit Price Update</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        You need PRICE_FEED_ROLE or DEFAULT_ADMIN_ROLE to submit
                        price updates
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border bg-card/50">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="h-5 w-5 text-[#9945FF]" />
                    Submit Price Update
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {entries.map((entry, index) => (
                        <div
                            key={index}
                            className="flex items-end gap-2 p-3 rounded-lg bg-muted/30"
                        >
                            <div className="flex-1">
                                <Label
                                    htmlFor={`token-${index}`}
                                    className="text-xs text-muted-foreground"
                                >
                                    Token Name
                                </Label>
                                <Input
                                    id={`token-${index}`}
                                    value={entry.token}
                                    onChange={(e) =>
                                        updateEntry(index, 'token', e.target.value)
                                    }
                                    placeholder="e.g., ETH"
                                    className="bg-background border-border"
                                />
                            </div>
                            <div className="flex-1">
                                <Label
                                    htmlFor={`price-${index}`}
                                    className="text-xs text-muted-foreground"
                                >
                                    Price (USD)
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        $
                                    </span>
                                    <Input
                                        id={`price-${index}`}
                                        type="text"
                                        inputMode="decimal"
                                        value={focusedPriceIndex === index ? entry.price : formatCurrency(entry.price)}
                                        onChange={(e) =>
                                            updateEntry(index, 'price', sanitizePriceInput(parseCurrency(e.target.value)))
                                        }
                                        onFocus={() => setFocusedPriceIndex(index)}
                                        onBlur={() => setFocusedPriceIndex(null)}
                                        placeholder="2,500.50"
                                        className="bg-background border-border pl-7"
                                    />
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEntry(index)}
                                disabled={entries.length === 1}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addEntry}
                            className="border-dashed border-[#9945FF] text-[#9945FF]"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Token
                        </Button>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:opacity-90 text-white"
                    >
                        {isLoading ? 'Processing...' : 'Send to All Chains'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
