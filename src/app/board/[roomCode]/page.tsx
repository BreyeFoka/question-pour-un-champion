'use client';

import { use, useState, useEffect } from 'react';
import { useGameState } from '@/hooks/useGameState';

export default function BoardPage({ params }: { params: Promise<{ roomCode: string }> }) {
    const { roomCode } = use(params);
    const { gameState, error } = useGameState(roomCode);
    
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        let interval: any;
        if (gameState?.timerEndsAt) {
            interval = setInterval(() => {
                const remaining = Math.max(0, Math.floor((gameState.timerEndsAt! - Date.now()) / 1000));
                setTimeLeft(remaining);
            }, 100);
        } else {
            setTimeLeft(null);
        }
        return () => clearInterval(interval);
    }, [gameState?.timerEndsAt]);

    if (error) return <div style={{ padding: '2rem', color: 'var(--error)' }}>{error}</div>;
    if (!gameState) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--yellow-qpuc)', fontSize: '2rem', paddingTop: '40vh' }}>Démarrage du plateau {roomCode}...</div>;

    if (gameState.state === 'Vainqueur') {
        const winner = [...gameState.players].sort((a,b) => b.score - a.score)[0];
        return (
            <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h1 style={{ fontSize: '4rem', color: 'var(--yellow-qpuc)', animation: 'fadeIn 1s' }}>NOUS AVONS UN CHAMPION !</h1>
                <h2 style={{ fontSize: '6rem', color: 'white', textTransform: 'uppercase', textShadow: '0 0 40px rgba(255,204,0,0.8)' }}>{winner?.name}</h2>
            </div>
        );
    }

    const buzzedPlayerId = gameState.firstBuzzer;
    const buzzedPlayer = buzzedPlayerId ? gameState.players.find(p => p.id === buzzedPlayerId) : null;

    let totalBars = 9;
    if (gameState.state === 'Le Quatre à la suite') totalBars = 4;
    if (gameState.state === 'Le Face-à-face') totalBars = 15;

    return (
        <div style={{ padding: '2rem', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <h1 className="tv-title" style={{ fontSize: '2rem', margin: 0 }}>Questions Pour Un Champion</h1>

                {/* Global Timer Display */}
                {timeLeft !== null && (
                    <div style={{ background: 'rgba(0,0,0,0.5)', border: '2px solid var(--text-muted)', padding: '0.5rem 2rem', borderRadius: '50px', fontSize: '2.5rem', fontWeight: 900, color: timeLeft <= 10 ? 'var(--error)' : 'white', animation: timeLeft <= 5 ? 'pulseBuzzer 0.5s infinite' : 'none' }}>
                        ⏱ {timeLeft}s
                    </div>
                )}

                <div style={{ background: 'var(--blue-bright)', padding: '0.8rem 2rem', borderRadius: '8px', border: '2px solid var(--yellow-qpuc)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>PLATEAU</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--yellow-qpuc)', letterSpacing: '4px' }}>{gameState.code}</div>
                </div>
            </div>

            {/* Current Phase */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <div style={{ display: 'inline-block', backgroundColor: 'var(--card-bg)', border: '2px solid var(--card-border)', padding: '1rem 3rem', borderRadius: '50px', fontSize: '2rem', fontWeight: 900, color: 'var(--yellow-qpuc)', textTransform: 'uppercase', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    {gameState.state}
                </div>
            </div>

            {/* Players Grid */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', flex: 1, alignItems: 'flex-start' }}>
                {gameState.players.map(p => {
                    const hasBuzzed = gameState.firstBuzzer === p.id;
                    const barsArray = Array.from({ length: totalBars });

                    return (
                        <div key={p.id} className="tv-panel" style={{ 
                            width: '300px',
                            textAlign: 'center', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            borderColor: hasBuzzed ? 'var(--yellow-qpuc)' : 'var(--card-border)',
                            boxShadow: hasBuzzed ? '0 0 60px rgba(255, 204, 0, 0.8)' : '0 10px 30px rgba(0,0,0,0.5)',
                            transform: hasBuzzed ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.3s cubic-bezier(0.1, 0.7, 1.0, 0.1)',
                            backgroundColor: hasBuzzed ? 'var(--blue-bright)' : 'var(--card-bg)',
                            position: 'relative'
                        }}>
                            <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'uppercase' }}>{p.name}</div>
                            <div style={{ fontSize: '1rem', color: hasBuzzed ? 'white' : 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>{p.profession}</div>
                            
                            <div style={{ fontSize: '5rem', fontWeight: 900, color: hasBuzzed ? 'white' : 'var(--yellow-qpuc)', marginBottom: '1rem', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                                {p.score}
                            </div>

                            <div className="score-bar-container" style={{ marginBottom: '1rem' }}>
                                {barsArray.map((_, i) => (
                                    <div key={i} className={`score-block ${p.score > i ? 'active' : ''}`} style={{ height: '15px' }} />
                                ))}
                            </div>
                            
                            {hasBuzzed && <div style={{ position: 'absolute', bottom: '-40px', left: 0, right: 0, color: 'var(--yellow-qpuc)', fontWeight: 900, fontSize: '2rem', animation: 'fadeIn 0.5s infinite alternate', textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>IL A LA MAIN !</div>}
                        </div>
                    );
                })}
                
                {gameState.players.length === 0 && (
                    <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4rem', fontStyle: 'italic' }}>
                        En attente des candidats... Le code est {gameState.code}
                    </div>
                )}
            </div>

            {/* Validation Modal Overlay on TV */}
            {buzzedPlayer && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', backgroundColor: 'rgba(0,30,60,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                    <h2 style={{ fontSize: '6rem', color: 'var(--yellow-qpuc)', marginBottom: '1rem', textShadow: '0 10px 30px rgba(0,0,0,0.8)', animation: 'fadeIn 0.2s', textTransform: 'uppercase' }}>
                        {buzzedPlayer.name} A LA MAIN !
                    </h2>
                </div>
            )}
        </div>
    );
}
