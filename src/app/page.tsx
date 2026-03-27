'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoomAction, joinRoomAction } from '@/app/actions';

export default function LandingPage() {
  const router = useRouter();
  const [role, setRole] = useState<'none' | 'join'>('none');
  const [joinType, setJoinType] = useState<'animateur' | 'candidat'>('candidat');
  const [playerName, setPlayerName] = useState('');
  const [profession, setProfession] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreateTVBoard() {
    setLoading(true);
    const res = await createRoomAction();
    if (res.success) {
      router.push(`/board/${res.roomCode}`);
    }
  }

  async function handleJoinRoom() {
    if (!roomCode) return alert("Le code du plateau est requis.");
    
    if (joinType === 'animateur') {
        router.push(`/host/${roomCode}`);
        return;
    }

    if (!playerName || !profession) return alert("Veuillez remplir vos informations.");
    
    setLoading(true);
    const res = await joinRoomAction(roomCode, playerName, profession);
    if(res.success) {
      router.push(`/player/${res.roomCode}?id=${res.playerId}`);
    } else {
      alert(res.message);
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="tv-panel animate-fade-in" style={{ width: '100%', maxWidth: '700px', textAlign: 'center' }}>
        <h1 className="tv-title" style={{ fontSize: '2.5rem', marginBottom: '2.5rem' }}>
          Questions Pour Un Champion
        </h1>

        {role === 'none' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <button onClick={handleCreateTVBoard} disabled={loading} className="btn" style={{ padding: '2rem 1rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📺</span>
                Démarrer l'Écran TV (Plateau)
             </button>
             <button onClick={() => setRole('join')} className="btn btn-secondary" style={{ padding: '2rem 1rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📱</span>
                Rejoindre avec son Smartphone
             </button>
          </div>
        )}

        {role === 'join' && (
          <div className="animate-fade-in" style={{ textAlign: 'left' }}>
             <h2 style={{ marginBottom: '1.5rem', color: 'var(--yellow-qpuc)', textAlign: 'center' }}>Rejoindre le plateau</h2>
             
             <div className="form-group" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
                <button className={joinType === 'candidat' ? 'btn' : 'btn btn-secondary'} style={{ padding: '0.8rem 1.5rem' }} onClick={() => setJoinType('candidat')}>Je suis Candidat</button>
                <button className={joinType === 'animateur' ? 'btn' : 'btn btn-secondary'} style={{ padding: '0.8rem 1.5rem' }} onClick={() => setJoinType('animateur')}>Je suis Animateur</button>
             </div>

             <div className="form-group">
                <label className="form-label">Code affiché sur la TV</label>
                <input type="text" placeholder="Ex: ABCD" style={{ textTransform: 'uppercase' }} maxLength={4} value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} />
             </div>

             {joinType === 'candidat' && (
                 <>
                    <div className="form-group">
                        <label className="form-label">Votre Prénom</label>
                        <input type="text" placeholder="Ex: Julien" value={playerName} onChange={e => setPlayerName(e.target.value)} />
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label className="form-label">Profession ou Passion</label>
                        <input type="text" placeholder="Ex: Professeur d'Histoire, Joueur d'échecs..." value={profession} onChange={e => setProfession(e.target.value)} />
                    </div>
                 </>
             )}

             <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
               <button onClick={handleJoinRoom} disabled={loading} className="btn" style={{ flex: 1 }}>C'est parti !</button>
               <button onClick={() => setRole('none')} className="btn btn-secondary">Annuler</button>
             </div>
          </div>
        )}
      </div>
    </main>
  );
}
