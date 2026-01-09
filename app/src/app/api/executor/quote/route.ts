/**
 * API route to proxy requests to Wormhole Executor API
 * This avoids CORS issues when calling from the browser
 */

import { NextRequest, NextResponse } from 'next/server';

// Executor API URLs (inline to avoid import path issues in Next.js API routes)
const EXECUTOR_API_URLS = {
    Mainnet: 'https://executor.labsapis.com/v0',
    Testnet: 'https://executor-testnet.labsapis.com/v0',
} as const;

type NetworkType = keyof typeof EXECUTOR_API_URLS;

function getExecutorApiUrl(network: NetworkType = 'Testnet'): string {
    return EXECUTOR_API_URLS[network];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { srcChain, dstChain, relayInstructions, network = 'Testnet' } = body;

        if (!srcChain || !dstChain) {
            return NextResponse.json(
                { error: 'Missing required parameters: srcChain, dstChain' },
                { status: 400 }
            );
        }

        const executorUrl = getExecutorApiUrl(network as NetworkType);
        
        // SDK's fetchQuote uses POST with JSON body
        const response = await fetch(`${executorUrl}/quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                srcChain,
                dstChain,
                relayInstructions,
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
        console.error('Executor API proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from Executor API' },
            { status: 500 }
        );
    }
}
