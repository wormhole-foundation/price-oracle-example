/**
 * Header component with title and wallet connection
 */

'use client';

import { ConnectButton } from './ConnectButton';

export function Header() {
    return (
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Wormhole Logo */}
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-[#9945FF]"
                    >
                        <circle
                            cx="20"
                            cy="20"
                            r="18"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                        />
                        <circle
                            cx="20"
                            cy="20"
                            r="12"
                            stroke="#14F195"
                            strokeWidth="2"
                            fill="none"
                        />
                        <circle
                            cx="20"
                            cy="20"
                            r="6"
                            fill="currentColor"
                        />
                    </svg>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
                        Price Oracle Demo
                    </h1>
                </div>
                <ConnectButton />
            </div>
        </header>
    );
}
