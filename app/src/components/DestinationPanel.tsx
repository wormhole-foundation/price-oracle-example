/**
 * Destination chain panel (Receiver contracts)
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { getContractAddress } from '@/lib/contracts';
import { getChainName } from '@/lib/chains';
import { usePauseStatus } from '@/hooks/usePauseStatus';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useTrackedTokens } from '@/hooks/useTrackedTokens';
import { PauseControls } from './PauseControls';
import { PriceDisplay } from './PriceDisplay';
import { Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

interface DestinationPanelProps {
    chainId: number;
}

export function DestinationPanel({ chainId }: DestinationPanelProps) {
    const contractAddress = getContractAddress(chainId);
    const { isPaused, isLoading: pauseLoading } = usePauseStatus(chainId);
    const { receiverAdminStatus } = useAdminRole();
    const isAdmin = receiverAdminStatus[chainId] || false;
    const { tokens: trackedTokens, removeToken } = useTrackedTokens();
    const [copied, setCopied] = useState(false);

    const copyAddress = () => {
        navigator.clipboard.writeText(contractAddress);
        setCopied(true);
        toast.success('Address copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-[#14F195]" />
                        {getChainName(chainId)}
                        <Badge
                            variant="outline"
                            className="ml-2 border-[#14F195] text-[#14F195]"
                        >
                            Receiver
                        </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {pauseLoading ? (
                            <Badge variant="outline">Loading...</Badge>
                        ) : isPaused ? (
                            <Badge variant="destructive">Paused</Badge>
                        ) : (
                            <Badge className="bg-[#14F195] text-black">
                                Active
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Contract Address */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                    <code className="text-xs font-mono flex-1 text-muted-foreground truncate">
                        {contractAddress}
                    </code>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={copyAddress}
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-[#14F195]" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Admin Controls */}
                {isAdmin && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Admin Controls
                        </span>
                        <PauseControls chainId={chainId} isAdmin={isAdmin} />
                    </div>
                )}

                <Separator />

                {/* Price Display */}
                <div>
                    <p className="text-sm text-muted-foreground mb-2">
                        Received Prices
                    </p>
                    <PriceDisplay
                        chainId={chainId}
                        tokens={trackedTokens}
                        onRemoveToken={removeToken}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
