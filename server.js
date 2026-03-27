const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Game State
const rooms = {};

const generateRoomCode = () => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (callback) => {
        const roomCode = generateRoomCode();
        socket.join(roomCode);
        rooms[roomCode] = {
            host: socket.id,
            code: roomCode,
            players: [], // { id, name, score, lockedOut }
            state: 'lobby', // lobby, 9_points, 4_a_la_suite, face_a_face
            buzzerLocked: false,
            firstBuzzer: null,
            timer: 0,
            intervalId: null
        };
        callback({ success: true, roomCode });
    });

    socket.on('joinRoom', ({ roomCode, name }, callback) => {
        const roomCodeUpper = roomCode.toUpperCase();
        const room = rooms[roomCodeUpper];
        if (!room) return callback({ success: false, message: 'Room not found' });
        
        socket.join(roomCodeUpper);
        const newPlayer = {
            id: socket.id,
            name: name || `Player ${room.players.length + 1}`,
            score: 0,
            lockedOut: false
        };
        room.players.push(newPlayer);
        
        io.to(roomCodeUpper).emit('stateUpdate', getRoomState(room));
        callback({ success: true, roomCode: roomCodeUpper });
    });

    socket.on('buzz', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        if (!room.buzzerLocked) {
            room.buzzerLocked = true;
            room.firstBuzzer = socket.id;
            
            room.players.forEach(p => {
                p.lockedOut = p.id !== socket.id;
            });
            
            io.to(roomCode).emit('buzzed', { playerId: socket.id });
            io.to(roomCode).emit('stateUpdate', getRoomState(room));
        }
    });

    socket.on('unlockBuzzers', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        room.buzzerLocked = false;
        room.firstBuzzer = null;
        room.players.forEach(p => p.lockedOut = false);
        
        io.to(roomCode).emit('buzzersUnlocked');
        io.to(roomCode).emit('stateUpdate', getRoomState(room));
    });

    socket.on('updateScore', ({ roomCode, playerId, delta }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.score += delta;
            io.to(roomCode).emit('stateUpdate', getRoomState(room));
        }
    });

    socket.on('changePhase', ({ roomCode, phase }) => {
        const room = rooms[roomCode];
        if (!room) return;
        room.state = phase;
        
        room.buzzerLocked = false;
        room.firstBuzzer = null;
        room.players.forEach(p => p.lockedOut = false);
        
        io.to(roomCode).emit('stateUpdate', getRoomState(room));
    });

    socket.on('startTimer', ({ roomCode, seconds }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        if (room.intervalId) clearInterval(room.intervalId);
        
        room.timer = seconds;
        io.to(roomCode).emit('timerUpdate', room.timer);
        
        room.intervalId = setInterval(() => {
            room.timer--;
            io.to(roomCode).emit('timerUpdate', room.timer);
            if (room.timer <= 0) {
                clearInterval(room.intervalId);
                room.intervalId = null;
            }
        }, 1000);
    });

    socket.on('stopTimer', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        if (room.intervalId) {
            clearInterval(room.intervalId);
            room.intervalId = null;
        }
    });

    socket.on('disconnect', () => {
        Object.keys(rooms).forEach(roomCode => {
            const room = rooms[roomCode];
            if (room.host === socket.id) {
                io.to(roomCode).emit('hostDisconnected');
                delete rooms[roomCode];
            } else {
                const pIndex = room.players.findIndex(p => p.id === socket.id);
                if (pIndex !== -1) {
                    room.players.splice(pIndex, 1);
                    io.to(roomCode).emit('stateUpdate', getRoomState(room));
                }
            }
        });
    });
  });

  function getRoomState(room) {
      return {
          code: room.code,
          players: room.players,
          state: room.state,
          buzzerLocked: room.buzzerLocked,
          firstBuzzer: room.firstBuzzer
      };
  }

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
