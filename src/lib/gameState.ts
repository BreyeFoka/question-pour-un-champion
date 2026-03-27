export interface Player {
    id: string;
    name: string;
    profession: string;
    score: number;
    lockedOut: boolean;
}

export interface Room {
    code: string;
    hostToken: string;
    players: Player[];
    state: string; // 'lobby', '9_points', '4_a_la_suite', 'face_a_face'
    buzzerLocked: boolean;
    firstBuzzer: string | null;
    timerEndsAt: number | null;
    subscribers: any[]; // ReadableStreamDefaultController[]
}

// Global state to survive Next.js HMR
const globalAny: any = global;
if (!globalAny.rooms) {
    globalAny.rooms = new Map<string, Room>();
}

export const activeRooms: Map<string, Room> = globalAny.rooms;

export function getRoom(code: string): Room | undefined {
    return activeRooms.get(code.toUpperCase());
}

export function createRoomEntry(code: string, hostToken: string) {
    activeRooms.set(code.toUpperCase(), {
        code: code.toUpperCase(),
        hostToken,
        players: [],
        state: 'lobby',
        buzzerLocked: false,
        firstBuzzer: null,
        timerEndsAt: null,
        subscribers: []
    });
}

export function notifyRoom(code: string) {
    const room = getRoom(code);
    if (!room) return;
    
    const publicState = {
        code: room.code,
        players: room.players,
        state: room.state,
        buzzerLocked: room.buzzerLocked,
        firstBuzzer: room.firstBuzzer,
        timerEndsAt: room.timerEndsAt
    };
    
    const message = `data: ${JSON.stringify(publicState)}\n\n`;
    
    const closedSubs = new Set<any>();
    room.subscribers.forEach(sub => {
        try {
            sub.enqueue(new TextEncoder().encode(message));
        } catch (e) {
            closedSubs.add(sub);
        }
    });
    
    // Cleanup dropped connections
    room.subscribers = room.subscribers.filter(sub => !closedSubs.has(sub));
}
