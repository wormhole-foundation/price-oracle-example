/**
 * API route to check transaction status via Executor API
 * Proxies requests to avoid CORS issues
 */

import { NextRequest, NextResponse } from 'next/server';

const EXECUTOR_API_URLS = {
    Mainnet: 'https://executor.labsapis.com/v0',
    Testnet: 'https://executor-testnet.labsapis.com/v0',
} as const;

type NetworkType = keyof typeof EXECUTOR_API_URLS;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { txHash, chainId, network = 'Testnet' } = body;

        if (!txHash) {
            return NextResponse.json(
                { error: 'Missing required parameter: txHash' },
                { status: 400 }
            );
        }

        const executorUrl = EXECUTOR_API_URLS[network as NetworkType];
        
        const response = await fetch(`${executorUrl}/status/tx`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                txHash,
                ...(chainId && { chainId }),
            }),
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Executor API error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Executor status API proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from Executor API' },
            { status: 500 }
        );
    }
}
