import { beforeEach, describe, expect, it } from 'vitest';
import {
    answerValidationAction,
    buzzAction,
    changePhaseAction,
    claimHostAction,
    createRoomAction,
    joinRoomAction,
    unlockBuzzersAction,
} from '@/app/actions';
import { activeRooms, getRoom } from '@/lib/gameState';

async function newRoom() {
    const { roomCode } = await createRoomAction();
    const host = await claimHostAction(roomCode);
    if (!host.success) throw new Error('host claim failed');
    return { roomCode, hostToken: host.hostToken };
}

async function join(roomCode: string, name: string) {
    const res = await joinRoomAction(roomCode, name, 'Testeur');
    if (!res.success || !res.playerId) throw new Error(`join failed: ${res.message}`);
    return res.playerId;
}

beforeEach(() => activeRooms.clear());

describe('host control', () => {
    it('gives the room to the first controller and refuses the next one', async () => {
        const { roomCode } = await createRoomAction();
        const first = await claimHostAction(roomCode);
        const second = await claimHostAction(roomCode);
        expect(first.success).toBe(true);
        expect(second.success).toBe(false);
    });

    it('lets the host back in with its saved token', async () => {
        const { roomCode, hostToken } = await newRoom();
        const again = await claimHostAction(roomCode, hostToken);
        expect(again).toEqual({ success: true, hostToken });
    });

    it('ignores host actions without the right token', async () => {
        const { roomCode } = await newRoom();
        await changePhaseAction(roomCode, 'not-the-token', 'Le Face-à-face');
        expect(getRoom(roomCode)!.state).toBe('lobby');
    });
});

describe('players', () => {
    it('rejects empty names and trims long ones', async () => {
        const { roomCode } = await newRoom();
        expect((await joinRoomAction(roomCode, '   ')).success).toBe(false);
        const id = await join(roomCode, 'x'.repeat(100));
        expect(getRoom(roomCode)!.players.find((p) => p.id === id)!.name).toHaveLength(40);
    });

    it('caps a room at ten players', async () => {
        const { roomCode } = await newRoom();
        for (let i = 0; i < 10; i++) await join(roomCode, `Joueur ${i}`);
        expect((await joinRoomAction(roomCode, 'Onzième')).success).toBe(false);
    });
});

describe('buzzers', () => {
    it('locks everyone else out after the first buzz', async () => {
        const { roomCode } = await newRoom();
        const a = await join(roomCode, 'Alice');
        const b = await join(roomCode, 'Bob');
        await buzzAction(roomCode, a);
        await buzzAction(roomCode, b);
        const room = getRoom(roomCode)!;
        expect(room.firstBuzzer).toBe(a);
        expect(room.players.find((p) => p.id === b)!.lockedOut).toBe(true);
    });

    it('ignores buzzes from people who are not in the room', async () => {
        const { roomCode } = await newRoom();
        await buzzAction(roomCode, 'stranger');
        expect(getRoom(roomCode)!.buzzerLocked).toBe(false);
    });

    it('reopens the buzzers when the host unlocks them', async () => {
        const { roomCode, hostToken } = await newRoom();
        const a = await join(roomCode, 'Alice');
        await buzzAction(roomCode, a);
        await unlockBuzzersAction(roomCode, hostToken);
        expect(getRoom(roomCode)!.buzzerLocked).toBe(false);
        expect(getRoom(roomCode)!.firstBuzzer).toBeNull();
    });
});

describe('rounds', () => {
    it('moves to "4 à la suite" when a player reaches 9 points', async () => {
        const { roomCode, hostToken } = await newRoom();
        const a = await join(roomCode, 'Alice');
        await changePhaseAction(roomCode, hostToken, 'Le Neuf points gagnants');
        for (let i = 0; i < 9; i++) await answerValidationAction(roomCode, hostToken, a, true);
        const room = getRoom(roomCode)!;
        expect(room.state).toBe('Le Quatre à la suite');
        expect(room.players.every((p) => p.score === 0)).toBe(true);
        expect(room.timerEndsAt).not.toBeNull();
    });

    it('resets the streak on a wrong answer in "4 à la suite"', async () => {
        const { roomCode, hostToken } = await newRoom();
        const a = await join(roomCode, 'Alice');
        await changePhaseAction(roomCode, hostToken, 'Le Quatre à la suite');
        await answerValidationAction(roomCode, hostToken, a, true);
        await answerValidationAction(roomCode, hostToken, a, true);
        await answerValidationAction(roomCode, hostToken, a, false);
        expect(getRoom(roomCode)!.players[0].score).toBe(0);
    });

    it('declares a winner at 15 points in the face-à-face', async () => {
        const { roomCode, hostToken } = await newRoom();
        const a = await join(roomCode, 'Alice');
        await changePhaseAction(roomCode, hostToken, 'Le Face-à-face');
        await answerValidationAction(roomCode, hostToken, a, true, 15);
        expect(getRoom(roomCode)!.state).toBe('Vainqueur');
    });
});
