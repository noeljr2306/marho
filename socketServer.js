import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import https from "https";

const server = createServer();
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL
        : "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const rooms = {};
const activeGames = {};
const sessionsFile = path.join(process.cwd(), "sessions.json");

const categories = {
  "General Knowledge": 9,
  "Science & Nature": 17,
  Art: 25,
  Geography: 22,
  History: 23,
  Celebrities: 20,
};

function saveSession(session) {
  try {
    const sessions = fs.existsSync(sessionsFile)
      ? JSON.parse(fs.readFileSync(sessionsFile, "utf-8"))
      : [];
    sessions.push(session);
    fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
  } catch (err) {
    console.error("Failed to save session:", err);
  }
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function fetchQuestions(amount, categoryId) {
  return new Promise((resolve, reject) => {
    const url = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&type=multiple`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.response_code === 0) resolve(parsed.results);
            else reject(new Error("Trivia API error"));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("create_room", ({ room, settings }) => {
    rooms[room] = {
      players: [],
      readyStates: {},
      settings: settings || { numQuestions: 10, category: "General Knowledge" },
      locked: false,
    };
    socket.emit("room_created", room);
  });

  socket.on("join_room", ({ room, player }) => {
    if (!rooms[room]) {
      socket.emit("room_not_found", { message: "Invalid Room Code" });
      return;
    }
    const roomState = rooms[room];
    if (roomState.locked) {
      socket.emit("room_locked");
      return;
    }
    if (!roomState.players.find((p) => p.id === socket.id)) {
      roomState.players.push({ id: socket.id, name: player.name });
    }
    socket.join(room);
    socket.emit("join_success", { settings: roomState.settings });
    io.to(room).emit("player_joined", roomState.players);
  });

  socket.on("update_settings", ({ room, settings }) => {
    if (!rooms[room]) return;
    rooms[room].settings = settings;
    io.to(room).emit("settings_updated", settings);
  });

  socket.on("start_game", async ({ room }) => {
    const roomState = rooms[room];
    if (!roomState || roomState.players.length === 0) return;

    roomState.locked = true;

    try {
      const questions = await fetchQuestions(
        roomState.settings.numQuestions,
        categories[roomState.settings.category],
      );

      const transformed = questions.map((q, i) => ({
        id: i,
        question: q.question,
        correct: q.correct_answer,
        options: shuffle([q.correct_answer, ...q.incorrect_answers]),
      }));

      activeGames[room] = {
        questions: transformed,
        answers: {},
        scores: {},
        currentQuestion: 0,
      };

      saveSession({
        room,
        players: roomState.players,
        startedAt: new Date().toISOString(),
      });

      io.to(room).emit("start_game", {
        questions: transformed.map(({ correct, ...q }) => q),
      });
    } catch (err) {
      socket.emit("game_error", { message: "Failed to fetch questions" });
    }
  });

  socket.on("submit_answer", ({ room, questionId, answer }) => {
    const game = activeGames[room];
    if (!game) return;

    const question = game.questions[questionId];
    if (!question) return;

    game.answers[questionId] ??= {};
    if (game.answers[questionId][socket.id]) return;

    game.answers[questionId][socket.id] = answer;

    if (answer === question.correct) {
      game.scores[socket.id] = (game.scores[socket.id] || 0) + 1;
    }

    const players = rooms[room]?.players ?? [];
    const allAnswered = players.every(
      (p) => game.answers[questionId][p.id] !== undefined,
    );

    if (allAnswered) {
      io.to(room).emit("question_ended", {
        correct: question.correct,
        scores: game.scores,
      });
      game.currentQuestion++;
    }
  });

  socket.on("disconnect", () => {
    for (const room in rooms) {
      const r = rooms[room];
      r.players = r.players.filter((p) => p.id !== socket.id);
      delete r.readyStates[socket.id];

      if (r.players.length === 0) {
        delete rooms[room];
        delete activeGames[room];
      } else {
        io.to(room).emit("player_joined", r.players);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Marho Socket Server running on port ${PORT}`);
});
