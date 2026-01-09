/**
 * Type definitions for the frontend
 */

export interface PriceEntry {
    token: string;
    price: string;
}

export interface TrackedToken {
    name: string;
    addedAt: number;
}

export type TransactionStep =
    | 'idle'
    | 'preparing'
    | 'confirming'
    | 'waiting-guardians'
    | 'relaying'
    | 'complete'
    | 'failed';

export interface TransactionStatus {
    step: TransactionStep;
    hash?: string;
    sequence?: bigint;
    error?: string;
    startTime?: number;
    destinationStatuses: Record<number, 'pending' | 'complete' | 'failed'>;
}

export interface ChainPanelProps {
    chainId: number;
    isSource?: boolean;
}
