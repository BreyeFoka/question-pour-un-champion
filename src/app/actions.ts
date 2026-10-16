'use server';

import { randomUUID } from 'crypto';
import { getRoom, createRoomEntry, notifyRoom, Player, Room } from '@/lib/gameState';

const MAX_PLAYERS = 10;
const MAX_TEXT = 40;

/** Host actions only run for the controller that claimed the room. */
function hostRoom(roomCode: string, hostToken: string): Room | undefined {
    const room = getRoom(roomCode);
    if (!room || !room.hostToken || room.hostToken !== hostToken) return undefined;
    return room;
}

function generateCode() {
    let result = '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed O, 0, I, 1 for less confusion
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

export async function createRoomAction() {
    let code = generateCode();
    while (getRoom(code)) code = generateCode();
    createRoomEntry(code);
    return { success: true, roomCode: code };
}

/**
 * The first controller to open a room becomes its host and gets a token to keep.
 * Coming back with that token (e.g. after a reload) works; anyone else is refused.
 */
export async function claimHostAction(roomCode: string, existingToken?: string | null) {
    const room = getRoom(roomCode);
    if (!room) return { success: false as const, message: 'Plateau introuvable.' };

    if (room.hostToken && existingToken === room.hostToken) {
        return { success: true as const, hostToken: room.hostToken };
    }
    if (room.hostToken) {
        return { success: false as const, message: 'Un animateur contrôle déjà ce plateau.' };
    }

    room.hostToken = randomUUID();
    notifyRoom(room.code);
    return { success: true as const, hostToken: room.hostToken };
}

export async function joinRoomAction(roomCode: string, playerName: string, profession: string = "") {
    const room = getRoom(roomCode);
    if (!room) return { success: false, message: 'Plateau introuvable.' };

    const name = playerName.trim().slice(0, MAX_TEXT);
    if (!name) return { success: false, message: 'Le nom est requis.' };
    if (room.players.length >= MAX_PLAYERS) return { success: false, message: 'Le plateau est complet.' };

    const playerId = randomUUID();
    const player: Player = {
        id: playerId,
        name,
        profession: profession.trim().slice(0, MAX_TEXT),
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

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.lockedOut) return;

    if (!room.buzzerLocked) {
        room.buzzerLocked = true;
        room.firstBuzzer = playerId;

        room.players.forEach(p => {
            p.lockedOut = p.id !== playerId;
        });

        notifyRoom(roomCode);
    }
}

export async function unlockBuzzersAction(roomCode: string, hostToken: string) {
    const room = hostRoom(roomCode, hostToken);
    if (!room) return;

    room.buzzerLocked = false;
    room.firstBuzzer = null;
    room.players.forEach(p => {
        p.lockedOut = false;
    });

    notifyRoom(roomCode);
}

export async function updateScoreAction(roomCode: string, hostToken: string, playerId: string, points: number) {
    const room = hostRoom(roomCode, hostToken);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
        player.score += points;
        notifyRoom(roomCode);
    }
}

export async function startTimerAction(roomCode: string, hostToken: string, seconds: number) {
    const room = hostRoom(roomCode, hostToken);
    if (!room) return;
    room.timerEndsAt = Date.now() + (seconds * 1000);
    notifyRoom(roomCode);
}

export async function answerValidationAction(roomCode: string, hostToken: string, playerId: string, isCorrect: boolean, points: number = 1) {
    const room = hostRoom(roomCode, hostToken);
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

export async function changePhaseAction(roomCode: string, hostToken: string, phase: string) {
    const room = hostRoom(roomCode, hostToken);
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

// Placeholder question set: returns the same sample questions for any topic.
// Swap this for an LLM call (topic + players' professions as context) to generate real ones.
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
