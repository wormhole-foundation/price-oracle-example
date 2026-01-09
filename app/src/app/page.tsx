/**
 * Price Oracle Demo - Main Page
 */

'use client';

import { Header } from '@/components/Header';
import { SourcePanel } from '@/components/SourcePanel';
import { DestinationPanel } from '@/components/DestinationPanel';
import { DESTINATION_CHAINS } from '@/lib/chains';

export default function Home() {
    return (
        <div className="min-h-screen">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Source Chain Panel (Sepolia) */}
                    <div>
                        <h2 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#9945FF]" />
                            Source Chain
                        </h2>
                        <SourcePanel />
                    </div>

                    {/* Destination Chains Panel */}
                    <div>
                        <h2 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#14F195]" />
                            Destination Chains
                        </h2>
                        <div className="space-y-4">
                            {DESTINATION_CHAINS.map((chain) => (
                                <DestinationPanel
                                    key={chain.id}
                                    chainId={chain.id}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
                    <p>
                        Built with{' '}
                        <a
                            href="https://wormhole.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#9945FF] hover:underline"
                        >
                            Wormhole
                        </a>{' '}
                        cross-chain messaging
                    </p>
                    <p className="mt-2">
                        <a
                            href="https://github.com/wormhole-foundation/price-oracle-example"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                        >
                            View Source on GitHub
                        </a>
                    </p>
                </footer>
            </main>
        </div>
    );
}
