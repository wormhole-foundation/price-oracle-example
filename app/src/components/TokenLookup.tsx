/**
 * Token lookup component
 */

'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface TokenLookupProps {
    onSearch: (token: string) => void;
}

export function TokenLookup({ onSearch }: TokenLookupProps) {
    const [token, setToken] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (token.trim()) {
            onSearch(token.trim());
            setToken('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter token name..."
                className="bg-background border-border flex-1"
            />
            <Button
                type="submit"
                size="icon"
                className="bg-[#9945FF] hover:bg-[#7B35CC]"
            >
                <Search className="h-4 w-4" />
            </Button>
        </form>
    );
}
