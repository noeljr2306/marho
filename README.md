# Marho (v1) — Multiplayer Trivia Game 🎮✨

**Marho** is a lightweight, real-time multiplayer trivia game built with **Next.js** and **Socket.IO**. Players join rooms, ready up in a lobby, and compete through a series of trivia questions fetched from the OpenTDB API.

---

## 🔧 Features

- Real-time multiplayer lobby and game flow (join rooms, ready states, start game)
- Server socket logic in `socketServer.js` using **socket.io**
- Questions fetched from OpenTDB (multiple choice)
- Session metadata persisted to `sessions.json` (local file)
- App pages:
  - `app/lobby/[roomCode]` — lobby & settings
  - `app/game/[roomCode]` — live gameplay
  - `app/results/[roomCode]` — final results and scoring
- Service worker: `public/sw.js`

---

## 🛠️ Tech Stack

- Next.js 16
- React 19
- Socket.IO
- Tailwind CSS
- TypeScript

---

## 🚀 Quickstart (local)

Prerequisites:

- Node.js (recommended v18+)
- npm (or yarn / pnpm)

1. Install dependencies

```bash
npm install
```

2. Start the Socket.IO server (default port: 4000)

```bash
node socketServer.js
```

> If Node errors about ESM imports, add `"type": "module"` to `package.json` or rename the server file to `socketServer.mjs`.

3. Start the Next.js dev server

```bash
npm run dev
```

4. Open the app

```
http://localhost:3000
```

To change the socket port, set `SOCKET_PORT` before starting the socket server, e.g.:

```bash
set SOCKET_PORT=5000 && node socketServer.js
```

---

## 📦 NPM Scripts

- `npm run dev` — start Next.js in development mode
- `npm run build` — build for production
- `npm run start` — run production build
- `npm run lint` — run ESLint

---

## 🧭 Architecture & Notes

- The socket server manages `rooms`, `activeGames`, and `readyStates` and uses OpenTDB to fetch questions.
- `sessions.json` is written to project root when games start.
- The server performs cleanup of empty rooms and prevents duplicate joins.

---

## ⚠️ Troubleshooting

- OpenTDB requests may fail or be rate-limited; if game start fails, check network or try again.
- If sockets don't connect, verify the socket server is running and that the frontend is pointed at the correct port.

---

## ✅ Contributing

Contributions welcome — open issues or PRs. Please add tests/notes when changing socket behavior or game logic.

---

## 📄 License

No license file is included yet. Consider adding an MIT (or other) license if you plan to publish or share the code.

---

Built with ❤️ and trivia.
