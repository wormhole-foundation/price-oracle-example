/**
 * Progressive toast for multi-step transactions
 * Shows 1/4, 2/4, 3/4, 4/4 progress with navigation
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, ExternalLink, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getTxUrl, getWormholeScanUrl, getExecutorExplorerUrl, getExplorerName } from '@/lib/explorers';

export interface TxStep {
    step: number;
    total: number;
    title: string;
    description?: string;
    txHash?: string;
    chainId?: number;
    wormholeScan?: boolean;
    executorExplorer?: boolean;
    destinationTxs?: Array<{ chainId: number; txHash: string }>;
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!', { duration: 1500 });
}

export function showProgressToast(initialStep: TxStep, id?: string | number) {
    const stepHistory: TxStep[] = [initialStep];
    let currentStepIndex = 0;
    const toastId = id || `tx-progress-${Date.now()}`;
    
    const renderStep = (step: TxStep, canGoBack: boolean, canGoForward: boolean) => {
        return (
            <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                            {step.step}/{step.total}
                        </span>
                        <span className="font-semibold">{step.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {canGoBack && (
                            <button
                                onClick={() => navigateStep(-1)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                                title="Previous step"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        )}
                        {canGoForward && (
                            <button
                                onClick={() => navigateStep(1)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                                title="Next step"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                
                {step.description && (
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                )}
                
                {step.txHash && (
                    <div className="flex items-center gap-2 mt-1">
                        <button
                            onClick={() => copyToClipboard(step.txHash!)}
                            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            title="Copy transaction hash"
                        >
                            <Copy className="h-3 w-3" />
                            {step.txHash.slice(0, 10)}...
                        </button>
                        
                        {step.chainId && (
                            <a
                                href={getTxUrl(step.chainId, step.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                title={`View on ${getExplorerName(step.chainId)}`}
                            >
                                <ExternalLink className="h-3 w-3" />
                                {getExplorerName(step.chainId)}
                            </a>
                        )}
                        
                        {step.wormholeScan && step.chainId && (
                            <a
                                href={getWormholeScanUrl(step.chainId, step.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                title="View on Wormhole Scan"
                            >
                                <Search className="h-3 w-3" />
                                WHScan
                            </a>
                        )}
                        
                        {step.executorExplorer && (
                            <a
                                href={getExecutorExplorerUrl(step.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                                title="View on Executor Explorer"
                            >
                                🪓
                                Executor
                            </a>
                        )}
                    </div>
                )}
                
                {step.destinationTxs && step.destinationTxs.length > 0 && (
                    <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">Destination transactions:</p>
                        {step.destinationTxs.map((dst, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <button
                                    onClick={() => copyToClipboard(dst.txHash)}
                                    className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                    title="Copy transaction hash"
                                >
                                    <Copy className="h-3 w-3" />
                                    {dst.txHash.slice(0, 10)}...
                                </button>
                                <a
                                    href={getTxUrl(dst.chainId, dst.txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                    title={`View on ${getExplorerName(dst.chainId)}`}
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    {getExplorerName(dst.chainId)}
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };
    
    const navigateStep = (direction: number) => {
        currentStepIndex += direction;
        const step = stepHistory[currentStepIndex];
        const canGoBack = currentStepIndex > 0;
        const canGoForward = currentStepIndex < stepHistory.length - 1;
        
        toast.custom(
            (t) => renderStep(step, canGoBack, canGoForward),
            {
                id: toastId,
                duration: Infinity,
            }
        );
    };
    
    toast.custom(
        (t) => renderStep(stepHistory[0], false, false),
        {
            id: toastId,
            duration: Infinity,
        }
    );
    
    return {
        update: (newStep: TxStep) => {
            // Only add to history if it's a new step number or has new content
            const lastStep = stepHistory[stepHistory.length - 1];
            if (newStep.step !== lastStep.step || newStep.title !== lastStep.title) {
                stepHistory.push(newStep);
                currentStepIndex = stepHistory.length - 1;
            } else {
                // Update the current step in place
                stepHistory[currentStepIndex] = newStep;
            }
            
            const canGoBack = currentStepIndex > 0;
            const canGoForward = currentStepIndex < stepHistory.length - 1;
            
            toast.custom(
                (t) => renderStep(stepHistory[currentStepIndex], canGoBack, canGoForward),
                {
                    id: toastId,
                    duration: Infinity,
                }
            );
        },
        dismiss: () => {
            toast.dismiss(toastId);
        },
        success: (message: string) => {
            toast.dismiss(toastId);
            toast.success(message);
        },
        error: (message: string) => {
            toast.dismiss(toastId);
            toast.error(message);
        },
    };
}
