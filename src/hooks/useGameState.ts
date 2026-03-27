'use client';

import { useEffect, useState } from 'react';
import { Room } from '@/lib/gameState';

export function useGameState(roomCode: string) {
    const [gameState, setGameState] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomCode) return;

        const eventSource = new EventSource(`/api/events?roomCode=${encodeURIComponent(roomCode)}`);

        eventSource.onmessage = (event) => {
            if (event.data === 'CONNECTED') {
                console.log('SSE Connected to room', roomCode);
                return;
            }
            try {
                const state = JSON.parse(event.data);
                setGameState(state);
            } catch (err) {
                console.error("Error parsing game state", err);
            }
        };

        eventSource.onerror = (err: any) => {
            console.error("EventSource failed:", err);
            setError("Connexion au serveur perdue. Veuillez recharger la page.");
            eventSource.close();
            // Very simple reconnect logic by setting timeout
            setTimeout(() => {
                setError(null);
                // The hook will not auto-rerun unless roomCode changes, so a hard reload might be best or a state toggle.
            }, 5000);
        };

        return () => {
            eventSource.close();
        };
    }, [roomCode]);

    return { gameState, error };
}
