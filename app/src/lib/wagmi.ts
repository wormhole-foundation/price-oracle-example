/**
 * wagmi configuration with AppKit
 */

import { cookieStorage, createStorage, http } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SUPPORTED_CHAINS, RPC_URLS } from './chains';

export const projectId = '5af1682c9344b8d4bdc05be5c350a8e8';

// Build transports dynamically from supported chains
const transports = Object.fromEntries(
    SUPPORTED_CHAINS.map((chain) => [chain.id, http(RPC_URLS[chain.id])])
);

export const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks: SUPPORTED_CHAINS,
    transports,
    storage: createStorage({
        storage: cookieStorage,
    }),
    ssr: true,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

declare module 'wagmi' {
    interface Register {
        config: typeof wagmiConfig;
    }
}
