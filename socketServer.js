import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import https from "https";

const server = createServer();
const io = new Server(server, {
  cors: { origin: true },
});

// In-memory room state and simple session persistence
const rooms = {};
const activeGames = {};
const sessionsFile = path.join(process.cwd(), "sessions.json");

// Open Trivia DB Category IDs
const categories = {
  "General Knowledge": 9,
  "Science & Nature": 17,
  Art: 25,
  Geography: 22,
  History: 23,
  Agriculture: 20, // Note: Open Trivia DB doesn't have Agriculture, using Mythology as placeholder
};

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

function fetchQuestions(amount, categoryId) {
  return new Promise((resolve, reject) => {
    const url = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&type=multiple`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.response_code === 0) {
              resolve(parsed.results);
            } else {
              reject(new Error(`API Error: ${parsed.response_code}`));
            }
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("join_room", ({ room, player }) => {
    if (!rooms[room])
      rooms[room] = {
        players: [],
        locked: false,
        settings: {
          category: "General Knowledge",
          numQuestions: 10,
          timeLimit: 30,
        },
        readyStates: {},
      };
    const roomState = rooms[room];
    if (roomState.locked) {
      socket.emit("room_locked");
      return;
    }

    socket.join(room);
    roomState.players.push({ id: socket.id, name: player.name });

    io.to(room).emit("player_joined", roomState.players);
    socket.emit("settings_updated", roomState.settings);
    socket.emit("ready_states_updated", roomState.readyStates);
    console.log(`Player ${player.name} joined room ${room}`);
  });

  // Host or spectator can subscribe to current room state without becoming a player
  socket.on("subscribe_room", ({ room }) => {
    if (!rooms[room])
      rooms[room] = {
        players: [],
        locked: false,
        settings: {
          category: "General Knowledge",
          numQuestions: 10,
          timeLimit: 30,
        },
        readyStates: {},
      };
    const roomState = rooms[room];
    socket.join(room);
    // Send only to the subscribing socket the current players list
    socket.emit("player_joined", roomState.players);
    socket.emit("settings_updated", roomState.settings);
    socket.emit("ready_states_updated", roomState.readyStates);
    console.log(`Socket ${socket.id} subscribed to room ${room}`);
  });

  socket.on("update_settings", ({ room, settings }) => {
    if (!rooms[room]) return;
    rooms[room].settings = settings;
    io.to(room).emit("settings_updated", settings);
    console.log(`Settings updated for room ${room}:`, settings);
  });

  socket.on("player_ready", ({ room, ready }) => {
    if (!rooms[room]) return;
    rooms[room].readyStates[socket.id] = ready;
    io.to(room).emit("ready_states_updated", rooms[room].readyStates);
    console.log(`Player ${socket.id} ready state: ${ready} in room ${room}`);
  });

  socket.on("start_game", async ({ room }) => {
    const roomState = rooms[room];
    if (!roomState) return;

    // Check if all players are ready
    const allReady = roomState.players.every(
      (p) => roomState.readyStates[p.id],
    );
    if (!allReady) {
      socket.emit("error", { message: "Not all players are ready" });
      return;
    }

    roomState.locked = true;

    // Snapshot players
    const playersSnapshot = roomState.players.slice();

    // Fetch questions from Open Trivia DB
    try {
      const categoryId = categories[roomState.settings.category];
      const questions = await fetchQuestions(
        roomState.settings.numQuestions,
        categoryId,
      );

      // Transform questions to our format
      const transformedQuestions = questions.map((q, index) => ({
        id: index + 1,
        question: q.question,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers,
        all_answers: shuffle([q.correct_answer, ...q.incorrect_answers]),
      }));

      const session = {
        id: `${room}-${Date.now()}`,
        room,
        players: playersSnapshot,
        questions: transformedQuestions,
        settings: roomState.settings,
        startedAt: new Date().toISOString(),
      };

      // persist session to disk
      saveSession(session);

      // Emit start signal with session payload
      io.to(room).emit("start_game", session);
      console.log(`Game started in room ${room}`);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
      socket.emit("error", {
        message: "Failed to start game. Please try again.",
      });
    }
  });

  socket.on("join_game", ({ room }) => {
    if (!activeGames[room]) {
      activeGames[room] = {
        answers: {},
        scores: {},
        currentQuestion: 0,
        questionStartTime: Date.now(),
      };
    }
    socket.join(room);
    console.log(`Player ${socket.id} joined game in room ${room}`);
  });

  socket.on("submit_answer", ({ room, questionId, answer, isCorrect }) => {
    if (!activeGames[room]) return;

    const game = activeGames[room];
    if (!game.answers[questionId]) {
      game.answers[questionId] = {};
    }
    game.answers[questionId][socket.id] = answer;

    if (isCorrect) {
      game.scores[socket.id] = (game.scores[socket.id] || 0) + 1;
    }

    // Check if all players have answered
    const roomState = rooms[room];
    if (roomState) {
      const allAnswered = roomState.players.every(
        (p) => game.answers[questionId][p.id] !== undefined,
      );
      if (allAnswered) {
        // End question and move to next
        io.to(room).emit("question_ended", {
          answers: game.answers[questionId],
          scores: game.scores,
        });
        game.currentQuestion++;
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    // Remove player from any rooms they were in
    for (const room of Object.keys(rooms)) {
      const r = rooms[room];
      const before = r.players.length;
      r.players = r.players.filter((p) => p.id !== socket.id);
      delete r.readyStates[socket.id];
      if (r.players.length !== before) {
        io.to(room).emit("player_joined", r.players);
        io.to(room).emit("ready_states_updated", r.readyStates);
      }
    }
  });
});

const PORT = process.env.SOCKET_PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
