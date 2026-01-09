/**
 * Hook to manage tracked tokens with localStorage persistence
 * Uses React Query for state management and cross-component sync
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'trackedTokens';
const QUERY_KEY = ['trackedTokens'] as const;

// Storage helpers
function getStoredTokens(): string[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function setStoredTokens(tokens: string[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function useTrackedTokens() {
    const queryClient = useQueryClient();

    // Query reads from localStorage
    const { data: tokens = [] } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: getStoredTokens,
        staleTime: Infinity, // Only refetch on manual invalidation
        refetchOnWindowFocus: true, // Sync on tab focus (cross-tab support)
    });

    // Mutation updates localStorage and invalidates query
    const mutation = useMutation({
        mutationFn: async (newTokens: string[]) => {
            setStoredTokens(newTokens);
            return newTokens;
        },
        onSuccess: (newTokens) => {
            // Update cache immediately for all components
            queryClient.setQueryData(QUERY_KEY, newTokens);
        },
    });

    const addToken = (token: string) => {
        const trimmed = token.trim();
        if (!trimmed || tokens.includes(trimmed)) return;
        mutation.mutate([...tokens, trimmed]);
    };

    const addTokens = (newTokens: string[]) => {
        const unique = [...new Set([...tokens, ...newTokens.map((t) => t.trim())])];
        if (unique.length === tokens.length) return;
        mutation.mutate(unique);
    };

    const removeToken = (token: string) => {
        mutation.mutate(tokens.filter((t) => t !== token));
    };

    return {
        tokens,
        addToken,
        addTokens,
        removeToken,
    };
}
