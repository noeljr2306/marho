import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";

const server = createServer();
const io = new Server(server, {
  cors: { origin: true },
});

// In-memory room state and simple session persistence
const rooms = {};
const sessionsFile = path.join(process.cwd(), "sessions.json");

function saveSession(session) {
  try {
    let sessions = [];
    if (fs.existsSync(sessionsFile)) {
      sessions = JSON.parse(fs.readFileSync(sessionsFile, "utf-8"));
    }
    sessions.push(session);
    fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
  } catch (err) {
    console.error("Failed to save session:", err);
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("join_room", ({ room, player }) => {
    if (!rooms[room]) rooms[room] = { players: [], locked: false };
    const roomState = rooms[room];
    if (roomState.locked) {
      socket.emit("room_locked");
      return;
    }

    socket.join(room);
    roomState.players.push({ id: socket.id, name: player.name });

    io.to(room).emit("player_joined", roomState.players);
    console.log(`Player ${player.name} joined room ${room}`);
  });

  // Host or spectator can subscribe to current room state without becoming a player
  socket.on("subscribe_room", ({ room }) => {
    if (!rooms[room]) rooms[room] = { players: [], locked: false };
    const roomState = rooms[room];
    socket.join(room);
    // Send only to the subscribing socket the current players list
    socket.emit("player_joined", roomState.players);
    console.log(`Socket ${socket.id} subscribed to room ${room}`);
  });

  socket.on("start_game", ({ room }) => {
    const roomState = rooms[room];
    if (!roomState) return;

    roomState.locked = true;

    // Snapshot players
    const playersSnapshot = roomState.players.slice();

    // Example questions list — replace with real question source as needed
    const questions = [
      { id: 1, q: "What is 2+2?", a: ["4", "3", "5"] },
      { id: 2, q: "What color is the sky?", a: ["Blue", "Green", "Red"] },
      { id: 3, q: "Which is a fruit?", a: ["Apple", "Car", "Stone"] },
    ];

    const shuffled = shuffle(questions);

    const session = {
      id: `${room}-${Date.now()}`,
      room,
      players: playersSnapshot,
      questions: shuffled,
      startedAt: new Date().toISOString(),
    };

    // persist session to disk
    saveSession(session);

    // Emit start signal with session payload
    io.to(room).emit("start_game", session);
    console.log(`Game started in room ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    // Remove player from any rooms they were in
    for (const room of Object.keys(rooms)) {
      const r = rooms[room];
      const before = r.players.length;
      r.players = r.players.filter((p) => p.id !== socket.id);
      if (r.players.length !== before) {
        io.to(room).emit("player_joined", r.players);
      }
    }
  });
});

const PORT = process.env.SOCKET_PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
