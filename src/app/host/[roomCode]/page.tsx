'use client';

import { use, useState, useEffect } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { changePhaseAction, unlockBuzzersAction, generateMockQAAction, answerValidationAction, startTimerAction } from '@/app/actions';

export default function HostControllerPage({ params }: { params: Promise<{ roomCode: string }> }) {
    const { roomCode } = use(params);
    const { gameState, error } = useGameState(roomCode);
    const [topic, setTopic] = useState('');
    const [questions, setQuestions] = useState<any[]>([]);
    const [qIndex, setQIndex] = useState(0);
    const [generating, setGenerating] = useState(false);
    
    // Global synchronized timer
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

    const handleGenerate = async () => {
        setGenerating(true);
        const res = await generateMockQAAction(topic, gameState?.players || []);
        setQuestions(res);
        setQIndex(0);
        setGenerating(false);
    };

    const handleAnswer = (isCorrect: boolean) => {
        if (!gameState?.firstBuzzer) return;
        answerValidationAction(roomCode, gameState.firstBuzzer, isCorrect, 1);
        if (isCorrect && qIndex < questions.length - 1) {
            setQIndex(qIndex + 1);
        }
    };

    if (error) return <div style={{ padding: '2rem', color: 'var(--error)' }}>{error}</div>;
    if (!gameState) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--yellow-qpuc)' }}>Connexion au contrôleur...</div>;

    const buzzedPlayerId = gameState.firstBuzzer;
    const buzzedPlayer = buzzedPlayerId ? gameState.players.find(p => p.id === buzzedPlayerId) : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem', minHeight: '100vh', background: 'var(--blue-primary)' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--yellow-qpuc)' }}>ANIMATEUR</div>
                <div style={{ background: 'var(--blue-bright)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem' }}>CODE: {gameState.code}</div>
            </div>

            {/* Fiches / Questions View */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Generation Form */}
                {questions.length === 0 && (
                    <div className="tv-panel" style={{ padding: '1rem' }}>
                        <input type="text" placeholder="Thème (ex: Littérature)" value={topic} onChange={e => setTopic(e.target.value)} style={{ marginBottom: '1rem' }} />
                        <button className="btn" onClick={handleGenerate} disabled={generating} style={{ width: '100%' }}>
                            {generating ? 'Génération...' : 'Créer les fiches'}
                        </button>
                    </div>
                )}

                {/* Active Question Fiche */}
                {questions.length > 0 && (
                    <div className="tv-panel" style={{ padding: '1.5rem', backgroundColor: '#fff', color: '#000', borderRadius: '4px', border: '5px solid var(--yellow-qpuc)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Fiche N° {qIndex + 1} / {questions.length}</span>
                            <span style={{ fontWeight: 'bold' }}>{gameState.state}</span>
                        </div>
                        
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.4, flex: 1 }}>
                            Je suis... {questions[qIndex].question}
                        </p>
                        
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed #ccc' }}>
                            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>RÉPONSE ATTENDUE :</div>
                            <div style={{ fontSize: '2rem', color: 'var(--success)', fontWeight: 900, textTransform: 'uppercase' }}>
                                {questions[qIndex].answer}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" style={{ color: '#000', borderColor: '#ccc', flex: 1, marginRight: '0.5rem' }} onClick={() => { if(qIndex > 0) setQIndex(qIndex - 1); }}>◀ Précédente</button>
                            <button className="btn btn-secondary" style={{ color: '#000', borderColor: '#ccc', flex: 1, marginLeft: '0.5rem' }} onClick={() => { if(qIndex < questions.length - 1) setQIndex(qIndex + 1); }}>Suivante ▶</button>
                        </div>
                    </div>
                )}

                {/* Main Action Area */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {!buzzedPlayer ? (
                        <>
                            {/* Phase Controls & Timer */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <select 
                                    value={gameState.state} 
                                    onChange={(e) => changePhaseAction(roomCode, e.target.value)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontSize: '1rem', fontWeight: 'bold' }}
                                >
                                    <option style={{color:'#000'}} value="Le Neuf points gagnants">Le 9 Points</option>
                                    <option style={{color:'#000'}} value="Le Quatre à la suite">Le 4 à la suite</option>
                                    <option style={{color:'#000'}} value="Le Face-à-face">Face à face</option>
                                    <option style={{color:'#000'}} value="Vainqueur">Vainqueur</option>
                                </select>
                                
                                {gameState.state === 'Le Quatre à la suite' && (
                                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '4px', alignItems: 'center' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft !== null && timeLeft <= 10 ? 'var(--error)' : 'white' }}>{timeLeft !== null ? timeLeft : 0}s</div>
                                        <button className="btn" style={{ padding: '0.5rem', fontSize: '1rem' }} onClick={() => startTimerAction(roomCode, 40)}>⟲</button>
                                    </div>
                                )}
                            </div>

                            <button className="btn" style={{ padding: '1.5rem', fontSize: '1.5rem', backgroundColor: 'var(--yellow-qpuc)', color: 'black' }} onClick={() => unlockBuzzersAction(roomCode)}>
                                TOP À LA VACHETTE !
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                            <div style={{ textAlign: 'center', fontSize: '1.5rem', color: 'var(--yellow-qpuc)', fontWeight: 900 }}>
                                {buzzedPlayer.name} RÉPOND !
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn" style={{ flex: 1, padding: '1.5rem', fontSize: '1.2rem', backgroundColor: 'var(--error)', color: 'white' }} onClick={() => handleAnswer(false)}>
                                    FAUX ❌
                                </button>
                                <button className="btn" style={{ flex: 1, padding: '1.5rem', fontSize: '1.2rem', backgroundColor: 'var(--success)', color: 'white' }} onClick={() => handleAnswer(true)}>
                                    VRAI ✅
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Candidate Dashboard (Mini list) */}
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                    {gameState.players.map(p => (
                        <div key={p.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 1rem', borderRadius: '20px', whiteSpace: 'nowrap', border: gameState.firstBuzzer === p.id ? '2px solid var(--yellow-qpuc)' : 'none' }}>
                            <span style={{ fontWeight: 800 }}>{p.score}</span> - {p.name}
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
