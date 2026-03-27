import { NextRequest } from 'next/server';
import { getRoom, notifyRoom } from '@/lib/gameState';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const roomCode = searchParams.get('roomCode');

    if (!roomCode) {
        return new Response('Missing roomCode', { status: 400 });
    }

    const room = getRoom(roomCode);
    if (!room) {
        return new Response('Room not found', { status: 404 });
    }

    const responseStream = new ReadableStream({
        start(controller) {
            // Send initial connection payload
            controller.enqueue(new TextEncoder().encode(`data: CONNECTED\n\n`));
            
            // Register subscriber
            room.subscribers.push(controller);
            
            // Instantly push the current state to the newly connected client
            notifyRoom(room.code);
            
            // Cleanup on close is handled during notifyRoom failing,
            // but Next.js also cancels streams when clients disconnect.
            request.signal.addEventListener('abort', () => {
                const index = room.subscribers.indexOf(controller);
                if (index > -1) {
                    room.subscribers.splice(index, 1);
                }
                try {
                   controller.close();
                } catch(e) {}
            });
        }
    });

    return new Response(responseStream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
