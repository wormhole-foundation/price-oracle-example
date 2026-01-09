/**
 * Providers wrapper for wagmi, AppKit, and TanStack Query
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { useState, type ReactNode } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { sepolia, baseSepolia, polygonAmoy } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';
import { wagmiAdapter, projectId } from '@/lib/wagmi';
import { SUPPORTED_CHAINS, SOURCE_CHAIN } from '@/lib/chains';
import { Toaster } from '@/components/ui/sonner';

// Map EVM chain IDs to AppKit networks
const APPKIT_NETWORKS: Record<number, AppKitNetwork> = {
    [sepolia.id]: sepolia,
    [baseSepolia.id]: baseSepolia,
    [polygonAmoy.id]: polygonAmoy,
};

// Build networks from config
const appKitNetworks = SUPPORTED_CHAINS.map(
    (chain) => APPKIT_NETWORKS[chain.id]
).filter(Boolean) as [AppKitNetwork, ...AppKitNetwork[]];

const defaultNetwork = APPKIT_NETWORKS[SOURCE_CHAIN.id];

// Create AppKit instance
const metadata = {
    name: 'Price Oracle Demo',
    description: 'Cross-chain price oracle demo using Wormhole messaging',
    url: 'https://wormhole.com',
    icons: ['https://wormhole.com/favicon.ico'],
};

createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: appKitNetworks,
    defaultNetwork,
    metadata,
    features: {
        analytics: false,
    },
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#9945FF',
    },
});

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5000,
                        refetchInterval: 10000,
                    },
                },
            })
    );

    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        style: {
                            background: '#1E1E2E',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#F5F5F5',
                        },
                    }}
                />
            </QueryClientProvider>
        </WagmiProvider>
    );
}
