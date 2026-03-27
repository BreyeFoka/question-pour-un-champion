'use server';

import { getRoom, createRoomEntry, notifyRoom, Player } from '@/lib/gameState';

function generateCode() {
    let result = '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed O, 0, I, 1 for less confusion
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

export async function createRoomAction() {
    const code = generateCode();
    // In a real app we'd assign a secure hostToken. For prototype, just use code as token.
    createRoomEntry(code, code);
    return { success: true, roomCode: code };
}

export async function joinRoomAction(roomCode: string, playerName: string, profession: string = "") {
    const room = getRoom(roomCode);
    if (!room) return { success: false, message: 'Room not found' };

    const playerId = Math.random().toString(36).substring(2, 9);
    const player: Player = {
        id: playerId,
        name: playerName,
        profession,
        score: 0,
        lockedOut: false
    };

    room.players.push(player);
    notifyRoom(roomCode);

    return { success: true, playerId, roomCode: room.code };
}

export async function buzzAction(roomCode: string, playerId: string) {
    const room = getRoom(roomCode);
    if (!room) return;

    if (!room.buzzerLocked) {
        room.buzzerLocked = true;
        room.firstBuzzer = playerId;

        room.players.forEach(p => {
            p.lockedOut = p.id !== playerId;
        });

        notifyRoom(roomCode);
    }
}

export async function unlockBuzzersAction(roomCode: string) {
    const room = getRoom(roomCode);
    if (!room) return;

    room.buzzerLocked = false;
    room.firstBuzzer = null;
    room.players.forEach(p => {
        p.lockedOut = false;
    });

    notifyRoom(roomCode);
}

export async function updateScoreAction(roomCode: string, playerId: string, points: number) {
    const room = getRoom(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
        player.score += points;
        notifyRoom(roomCode);
    }
}

export async function startTimerAction(roomCode: string, seconds: number) {
    const room = getRoom(roomCode);
    if (!room) return;
    room.timerEndsAt = Date.now() + (seconds * 1000);
    notifyRoom(roomCode);
}

export async function answerValidationAction(roomCode: string, playerId: string, isCorrect: boolean, points: number = 1) {
    const room = getRoom(roomCode);
    if (!room) return;

    if (isCorrect) {
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.score += points;
            
            // Auto-progression logic
            if (room.state === 'Le Neuf points gagnants' && player.score >= 9) {
                room.state = 'Le Quatre à la suite';
                room.players.forEach(p => p.score = 0);
                room.timerEndsAt = Date.now() + 40000;
            } else if (room.state === 'Le Quatre à la suite' && player.score >= 4) {
                room.state = 'Le Face-à-face';
                room.players.forEach(p => p.score = 0);
                room.timerEndsAt = null;
            } else if (room.state === 'Le Face-à-face' && player.score >= 15) {
                room.state = 'Vainqueur';
                room.timerEndsAt = null;
            }
        }
    } else {
        // Authentic "4 à la suite" mechanic: wrong answer brings your current score streak back to 0!
        if (room.state === 'Le Quatre à la suite') {
            const player = room.players.find(p => p.id === playerId);
            if (player) player.score = 0;
        }
    }
    
    room.buzzerLocked = false;
    room.firstBuzzer = null;
    room.players.forEach(p => p.lockedOut = false);

    notifyRoom(roomCode);
}

export async function changePhaseAction(roomCode: string, phase: string) {
    const room = getRoom(roomCode);
    if (!room) return;

    room.state = phase;
    room.players.forEach(p => p.score = 0);
    if (phase === 'Le Quatre à la suite') {
        room.timerEndsAt = Date.now() + 40000;
    } else {
        room.timerEndsAt = null;
    }
    room.buzzerLocked = false;
    room.firstBuzzer = null;
    room.players.forEach(p => p.lockedOut = false);

    notifyRoom(roomCode);
}

export async function generateMockQAAction(topic: string, players: any[] = []) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const safeTopic = topic || "Culture Générale";
    
    // In actual implementation, we pass the players' passions to the LLM context message.
    const professions = players.map(p => p.profession).filter(Boolean);
    const profText = professions.length > 0 ? ` (Clin d'oeil aux candidats: ${professions.join(', ')})` : "";
    
    return [
        { question: `un souverain français célèbre lié au thème ${safeTopic}${profText}.`, answer: "LOUIS XIV" },
        { question: `la capitale de l'Australie, une question classique de géographie.`, answer: "CANBERRA" },
        { question: `le plus grand océan de notre planète Terre.`, answer: "L'OCÉAN PACIFIQUE" },
    ];
}
