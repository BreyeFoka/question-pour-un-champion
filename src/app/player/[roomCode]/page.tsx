'use client';

import { use, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import { buzzAction } from '@/app/actions';

export default function PlayerPage({ params }: { params: Promise<{ roomCode: string }> }) {
    const { roomCode } = use(params);
    const searchParams = useSearchParams();
    const playerId = searchParams.get('id');
    const { gameState, error } = useGameState(roomCode);

    // Timeout countdown visual trick when buzzer pressed
    const [buzzTimeout, setBuzzTimeout] = useState(0);

    useEffect(() => {
        let interval: any;
        if (buzzTimeout > 0) {
            interval = setInterval(() => setBuzzTimeout(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [buzzTimeout]);

    if (error) return <div style={{ padding: '2rem', color: 'var(--error)', textAlign: 'center', paddingTop: '40vh', fontWeight: 'bold' }}>{error}</div>;
    if (!gameState) return <div style={{ padding: '2rem', textAlign: 'center', paddingTop: '40vh', color: 'var(--yellow-qpuc)', fontWeight: 'bold' }}>Connexion au plateau {roomCode}...</div>;

    const me = gameState.players.find(p => p.id === playerId);
    if (!me) return <div style={{ padding: '2rem', textAlign: 'center', paddingTop: '40vh', color: 'var(--error)' }}>Candidat introuvable.</div>;

    const isLocked = gameState.buzzerLocked;
    const didIBuzz = gameState.firstBuzzer === me.id;
    
    // Reset buzz timeout visual when buzzer unlocks
    if (!isLocked && buzzTimeout > 0) {
        setBuzzTimeout(0);
    }

    let btnClass = "buzzer-btn";
    let statusText = "EN ATTENTE...";
    
    if (didIBuzz) {
        btnClass += " won";
        statusText = buzzTimeout > 0 ? `C'EST À VOUS ! (${buzzTimeout}s)` : "C'EST À VOUS !";
    } else if (isLocked) {
        btnClass += " locked";
        statusText = "TROP TARD";
    }

    const handleBuzz = () => {
        if (!isLocked) {
            buzzAction(roomCode, playerId as string);
            setBuzzTimeout(5); // Start a 5 second visual timer
        }
    };

    // Calculate score bars based on phase
    let totalBars = 9; // Default 'Le 9 points gagnants'
    if (gameState.state === 'Le Quatre à la suite') totalBars = 4;
    if (gameState.state === 'Le Face-à-face') totalBars = 15;

    const barsArray = Array.from({ length: totalBars });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '1rem' }}>
            
            <div className="tv-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', marginBottom: '1rem', border: 'none', background: 'var(--blue-bright)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'white' }}>CANDIDAT : <span style={{ color: 'var(--yellow-qpuc)' }}>{me.name}</span></h2>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}> PLATEAU: {roomCode} | {gameState.state}</div>
                    </div>
                    <div style={{ background: 'var(--blue-primary)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 900, fontSize: '1.2rem', border: '1px solid var(--card-border)' }}>
                        PTS: <span style={{ color: 'var(--yellow-qpuc)' }}>{me.score}</span>
                    </div>
                </div>

                {/* Energy Bars container */}
                <div className="score-bar-container">
                    {barsArray.map((_, i) => (
                        <div key={i} className={`score-block ${me.score > i ? 'active' : ''}`} />
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button 
                    className={btnClass} 
                    onClick={handleBuzz}
                    disabled={isLocked && !didIBuzz}
                    style={{
                        width: 'clamp(250px, 75vw, 450px)',
                        aspectRatio: '1/1',
                        borderRadius: '50%',
                        border: '12px solid rgba(255, 255, 255, 0.15)',
                        fontSize: '3.5rem',
                        fontWeight: 900,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        transition: 'all 0.1s cubic-bezier(0.1, 0.7, 1.0, 0.1)',
                        boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.4), 0 15px 40px rgba(0,0,0,0.6)',
                        color: 'var(--text-dark)',
                        textTransform: 'uppercase'
                    }}
                >
                    BUZZ
                </button>
            </div>

            <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '1.8rem', fontWeight: 900, color: didIBuzz ? 'var(--yellow-qpuc)' : (isLocked ? 'var(--error)' : 'var(--text-main)') }}>
                {statusText}
            </div>

            <style jsx>{`
                .buzzer-btn {
                    background: radial-gradient(circle at 30% 30%, #ffd633, #e6b800);
                }
                .buzzer-btn:active:not(:disabled) {
                    transform: scale(0.96);
                    box-shadow: inset 0 5px 10px rgba(0,0,0,0.2), 0 5px 15px rgba(0,0,0,0.5);
                }
                .buzzer-btn.locked {
                    background: radial-gradient(circle at 30% 30%, #555555, #222222);
                    color: #888888 !important;
                    border-color: rgba(255,255,255,0.05);
                    transform: scale(0.98);
                }
                .buzzer-btn.won {
                    background: radial-gradient(circle at 30% 30%, #ff6633, #cc3300);
                    color: white !important;
                    border-color: rgba(255,204,0,0.8);
                    box-shadow: 0 0 60px rgba(255, 69, 0, 0.9) !important;
                    animation: pulseBuzzer 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                @keyframes pulseBuzzer {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.04); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
