/**
 * Token tracker component - allows users to track token prices across all chains
 * This component is shown to all users, not just admins
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTrackedTokens } from '@/hooks/useTrackedTokens';
import { Search, Eye, X } from 'lucide-react';

export function TokenTracker() {
    const { tokens: trackedTokens, addToken, removeToken } = useTrackedTokens();
    const [tokenToTrack, setTokenToTrack] = useState('');

    const handleTrackToken = (e: React.FormEvent) => {
        e.preventDefault();
        if (tokenToTrack.trim()) {
            addToken(tokenToTrack.trim());
            setTokenToTrack('');
        }
    };

    return (
        <Card className="border-border bg-card/50">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5 text-[#9945FF]" />
                    Track Token Prices
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <form onSubmit={handleTrackToken} className="flex gap-2">
                    <Input
                        value={tokenToTrack}
                        onChange={(e) => setTokenToTrack(e.target.value)}
                        placeholder="Enter token name to track..."
                        className="bg-background border-border flex-1"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="bg-[#9945FF] hover:bg-[#7B35CC]"
                    >
                        <Search className="h-4 w-4" />
                    </Button>
                </form>

                {trackedTokens.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {trackedTokens.map((token) => (
                            <Badge
                                key={token}
                                variant="secondary"
                                className="flex items-center gap-1 px-2 py-1"
                            >
                                {token}
                                <button
                                    type="button"
                                    onClick={() => removeToken(token)}
                                    className="ml-1 hover:text-destructive"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Tracked tokens will appear on all chain panels
                </p>
            </CardContent>
        </Card>
    );
}
