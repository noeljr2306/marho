"use client";

import React, { useEffect, useState, use, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

const categories = [
  "General Knowledge",
  "Science & Nature",
  "Art",
  "Geography",
  "History",
  "Celebrities",
];

const SOCKET_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : "http://localhost:4000";

export default function LobbyPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const name = search?.get("name") || "Anonymous";
  const hostFlag = search?.get("host") === "true";

  const socketRef = useRef<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [locked, setLocked] = useState(false);
  const [settings, setSettings] = useState({
    category: "General Knowledge",
    numQuestions: 10,
    timeLimit: 30,
  });
  const [readyStates, setReadyStates] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);
    }

    const socket = socketRef.current;

    socket.on("connect", () => {
      setSocketId(socket.id || null);

      if (hostFlag) {
        // If host, create the room on the server first
        socket.emit("create_room", { room: roomCode, settings });
      } else {
        // If player, try to join
        socket.emit("join_room", { room: roomCode, player: { name } });
      }
    });

    socket.on("room_not_found", (data) => {
      setErrorMessage(data.message || "Room not found!");
      // Redirect back home after a short delay if the room is invalid
      setTimeout(() => router.push("/"), 3000);
    });

    socket.on("player_joined", (playersList) => {
      setPlayers(playersList);
    });

    socket.on("settings_updated", (newSettings) => {
      setSettings(newSettings);
      setCurrentCategoryIndex(categories.indexOf(newSettings.category));
    });

    socket.on("ready_states_updated", (states) => {
      setReadyStates(states);
    });

    socket.on("room_locked", () => setLocked(true));

    socket.on("start_game", (gameData) => {
      // Store game data for the next screen
      sessionStorage.setItem(`game_${roomCode}`, JSON.stringify(gameData));
      router.push(`/game/${roomCode}`);
    });

    socket.on("game_error", ({ message }) => {
      setErrorMessage(message);
    });

    return () => {
      socket.off("room_not_found");
      socket.off("player_joined");
      socket.off("settings_updated");
      socket.off("ready_states_updated");
      socket.off("start_game");
      socket.off("game_error");
    };
  }, [roomCode, name, hostFlag, router]);

  const updateSettings = (newSettings: typeof settings) => {
    if (!socketRef.current || !hostFlag) return;
    setSettings(newSettings);
    socketRef.current.emit("update_settings", {
      room: roomCode,
      settings: newSettings,
    });
  };

  const toggleReady = () => {
    if (!socketRef.current?.id) return;
    const currentReady = readyStates[socketRef.current.id] || false;
    socketRef.current.emit("player_ready", {
      room: roomCode,
      ready: !currentReady,
    });
  };

  const startGame = () => {
    socketRef.current?.emit("start_game", { room: roomCode });
  };

  const isReady = socketId ? readyStates[socketId] : false;
  const allReady =
    players.length > 0 && players.every((p) => readyStates[p.id]);

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F2ED]">
        <div className="bg-[#FF0055] text-white p-12 border-4 border-black shadow-[12px_12px_0px_0px_black] text-center">
          <h1 className="text-4xl font-black mb-4 uppercase">Error</h1>
          <p className="text-xl font-bold">{errorMessage}</p>
          <p className="mt-4 animate-pulse uppercase">Returning to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center bg-[#F4F2ED] text-black font-sans">
      <div className="w-full max-w-3xl mb-8">
        <div className="bg-[#FFD700] border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <h1 className="text-3xl md:text-5xl font-[900] tracking-tight uppercase text-center">
            ROOM: <span className="underline">{roomCode}</span>
          </h1>
        </div>
      </div>

      <div className="w-full max-w-3xl bg-white border-[4px] border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex-1 flex flex-col">
        {hostFlag ? (
          <>
            <div className="mb-8">
              <h3 className="text-2xl font-[900] mb-4 uppercase italic">
                1. Select Theme
              </h3>
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    const newIndex =
                      (currentCategoryIndex - 1 + categories.length) %
                      categories.length;
                    setCurrentCategoryIndex(newIndex);
                    updateSettings({
                      ...settings,
                      category: categories[newIndex],
                    });
                  }}
                  className="w-12 h-12 border-4 border-black bg-white shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center text-2xl font-black"
                >
                  {" "}
                  &lt;{" "}
                </button>
                <div className="flex-1 p-4 border-4 border-black bg-[#00FF99] font-[900] text-xl text-center shadow-[4px_4px_0px_0px_black]">
                  {settings.category}
                </div>
                <button
                  onClick={() => {
                    const newIndex =
                      (currentCategoryIndex + 1) % categories.length;
                    setCurrentCategoryIndex(newIndex);
                    updateSettings({
                      ...settings,
                      category: categories[newIndex],
                    });
                  }}
                  className="w-12 h-12 border-4 border-black bg-white shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center text-2xl font-black"
                >
                  {" "}
                  &gt;{" "}
                </button>
              </div>
            </div>

            <div className="mb-8 space-y-6">
              <h3 className="text-2xl font-[900] mb-4 uppercase italic">
                2. Set Rules
              </h3>
              <div className="space-y-4">
                <div className="p-4 border-2 border-black bg-[#f0f0f0]">
                  <label className="block text-lg font-black mb-2 uppercase">
                    Questions: {settings.numQuestions}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={settings.numQuestions}
                    onChange={(e) =>
                      updateSettings({
                        ...settings,
                        numQuestions: parseInt(e.target.value),
                      })
                    }
                    className="w-full h-4 bg-black appearance-none cursor-pointer accent-[#FFD700]"
                  />
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-[900] mb-4 uppercase italic">
              3. Squad ({players.length})
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 border-4 border-black font-black text-center shadow-[4px_4px_0px_0px_black] ${readyStates[p.id] ? "bg-[#00FF99]" : "bg-[#FF0055] text-white"}`}
                >
                  {p.name} {readyStates[p.id] ? "✓" : "..."}
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              disabled={players.length === 0 || !allReady || locked}
              className={`w-full py-5 text-2xl font-[900] border-4 border-black shadow-[8px_8px_0px_0px_black] bg-[#00FF99] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all ${
                (players.length === 0 || !allReady || locked) &&
                "grayscale opacity-50 cursor-not-allowed"
              }`}
            >
              IGNITE QUIZ
            </button>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-4xl font-[900] mb-4 uppercase">
              READY UP, {name}!
            </h2>
            <p className="text-xl font-bold mb-8 bg-[#FFD700] p-2 border-2 border-black shadow-[4px_4px_0px_0px_black]">
              Category: {settings.category}
            </p>
            <button
              onClick={toggleReady}
              className={`w-full py-8 text-3xl font-[900] border-4 border-black shadow-[8px_8px_0px_0px_black] mb-8 transition-all active:shadow-none ${isReady ? "bg-[#00FF99] translate-x-1 translate-y-1 shadow-none" : "bg-[#FF0055] text-white"}`}
            >
              {isReady ? "READY TO GO!" : "CLICK TO READY"}
            </button>
            <div className="w-16 h-16 bg-[#FF0055] border-4 border-black animate-bounce shadow-[4px_4px_0px_0px_black]" />
          </div>
        )}
      </div>
    </div>
  );
}
