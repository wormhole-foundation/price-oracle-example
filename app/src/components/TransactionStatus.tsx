/**
 * Transaction status panel showing progress
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { DESTINATION_CHAINS, getChainName } from '@/lib/chains';
import type { TransactionStatus as TxStatus } from '@/types';
import {
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';

interface TransactionStatusProps {
    status: TxStatus;
    onReset?: () => void;
}

const STEP_LABELS: Record<string, string> = {
    idle: 'Ready',
    preparing: 'Preparing transaction...',
    confirming: 'Waiting for wallet confirmation...',
    'waiting-guardians': 'Waiting for Wormhole Guardians (~1-2 min)...',
    relaying: 'Relaying to destination chains...',
    complete: 'Complete!',
    failed: 'Failed',
};

export function TransactionStatus({ status, onReset }: TransactionStatusProps) {
    if (status.step === 'idle') {
        return null;
    }

    const elapsed = status.startTime
        ? Math.floor((Date.now() - status.startTime) / 1000)
        : 0;
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const getStepIcon = () => {
        switch (status.step) {
            case 'complete':
                return <CheckCircle2 className="h-5 w-5 text-[#14F195]" />;
            case 'failed':
                return <XCircle className="h-5 w-5 text-destructive" />;
            default:
                return <Loader2 className="h-5 w-5 animate-spin text-[#9945FF]" />;
        }
    };

    return (
        <Card className="border-border bg-card/50 mt-6">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        {getStepIcon()}
                        Transaction Status
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className="border-muted-foreground"
                        >
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(elapsed)}
                        </Badge>
                        {(status.step === 'complete' || status.step === 'failed') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onReset}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                New
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Step */}
                <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium">
                        {STEP_LABELS[status.step]}
                    </p>
                    {status.hash && (
                        <a
                            href={`https://sepolia.etherscan.io/tx/${status.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#9945FF] hover:underline flex items-center gap-1 mt-1"
                        >
                            View on Etherscan
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                    {status.error && (
                        <p className="text-xs text-destructive mt-1">
                            {status.error}
                        </p>
                    )}
                </div>

                {/* Destination Chain Status */}
                {(status.step === 'relaying' ||
                    status.step === 'complete' ||
                    status.step === 'waiting-guardians') && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                Destination Chains
                            </p>
                            {DESTINATION_CHAINS.map((chain) => {
                                const chainStatus =
                                    status.destinationStatuses[chain.id];
                                return (
                                    <div
                                        key={chain.id}
                                        className="flex items-center justify-between p-2 rounded bg-muted/20"
                                    >
                                        <span className="text-sm">
                                            {getChainName(chain.id)}
                                        </span>
                                        <DestinationStatus status={chainStatus} />
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Progress Indicator */}
                {status.step !== 'complete' && status.step !== 'failed' && (
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#9945FF] to-[#14F195] animate-pulse"
                            style={{
                                width:
                                    status.step === 'preparing'
                                        ? '20%'
                                        : status.step === 'confirming'
                                          ? '40%'
                                          : status.step === 'waiting-guardians'
                                            ? '60%'
                                            : '80%',
                            }}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function DestinationStatus({
    status,
}: {
    status: 'pending' | 'complete' | 'failed' | undefined;
}) {
    switch (status) {
        case 'complete':
            return (
                <Badge className="bg-[#14F195] text-black">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                </Badge>
            );
        case 'failed':
            return (
                <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Failed
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="border-[#9945FF] text-[#9945FF]">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Pending
                </Badge>
            );
    }
}
