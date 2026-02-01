"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

const categories = [
  "General Knowledge",
  "Science & Nature",
  "Art",
  "Geography",
  "History",
  "Agriculture",
];

let socket: Socket | null = null;
const SOCKET_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : "http://localhost:4000";

export default function LobbyPage({
  params,
}: {
  params: { roomCode: string };
}) {
  const { roomCode } = params;
  const router = useRouter();
  const search = useSearchParams();
  const name = search?.get("name") || null;
  const hostFlag = search?.get("host") === "true";

  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [locked, setLocked] = useState(false);
  const [joined, setJoined] = useState(false);
  const [settings, setSettings] = useState({
    category: "General Knowledge",
    numQuestions: 10,
    timeLimit: 30,
  });
  const [readyStates, setReadyStates] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  useEffect(() => {
    socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Connected to socket", socket?.id);

      // If participant (has name), join the room automatically
      if (name && !hostFlag && !joined) {
        socket?.emit("join_room", { room: roomCode, player: { name } });
        setJoined(true);
      }

      // If host, subscribe to the room to get current state
      if (hostFlag) {
        socket?.emit("subscribe_room", { room: roomCode });
      }
    });

    socket.on("player_joined", (playersList) => {
      setPlayers(playersList);
    });

    socket.on("room_locked", () => {
      setLocked(true);
    });

    socket.on("settings_updated", (newSettings) => {
      setSettings(newSettings);
      setCurrentCategoryIndex(categories.indexOf(newSettings.category));
    });

    socket.on("ready_states_updated", (states) => {
      setReadyStates(states);
    });

    socket.on("start_game", (session) => {
      try {
        sessionStorage.setItem(`session:${roomCode}`, JSON.stringify(session));
      } catch (err) {
        console.warn("Could not persist session to sessionStorage", err);
      }
      // Redirect all users to the game page
      router.push(`/game/${roomCode}`);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSettings = (newSettings: typeof settings) => {
    if (!socket || !hostFlag) return;
    setSettings(newSettings);
    socket.emit("update_settings", { room: roomCode, settings: newSettings });
  };

  const toggleReady = () => {
    if (!socket) return;
    const currentReady = readyStates[socket.id] || false;
    socket.emit("player_ready", { room: roomCode, ready: !currentReady });
  };

  const startGame = () => {
    if (!socket) return;
    socket.emit("start_game", { room: roomCode });
  };

  const allReady =
    players.length > 0 && players.every((p) => readyStates[p.id]);

  return (
    <div className="min-h-screen p-6 flex flex-col items-center bg-marho-bg">
      {/* Header */}
      <div className="w-full max-w-3xl mb-8">
        <div className="bg-marho-yellow border-4 border-black shadow-brutal-lg p-6 flex items-center justify-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight uppercase">
            Room Code: <span className="ml-4">{roomCode}</span>
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full max-w-3xl bg-white border-4 border-black p-6 shadow-brutal flex-1 flex flex-col">
        {/* Host view */}
        {hostFlag ? (
          <>
            {/* Category Carousel */}
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">Category</h3>
              <div className="flex items-center justify-center space-x-4">
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
                  className="p-2 border-4 border-black bg-white font-bold hover:bg-gray-100"
                >
                  ‹
                </button>
                <div className="p-4 border-4 border-black bg-marho-yellow font-bold text-center min-w-[200px]">
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
                  className="p-2 border-4 border-black bg-white font-bold hover:bg-gray-100"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Settings Sliders */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-lg font-bold mb-2">
                  Number of Questions: {settings.numQuestions}
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
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-lg font-bold mb-2">
                  Time Limit: {settings.timeLimit}s
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={settings.timeLimit}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      timeLimit: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>

            <h2 className="text-2xl font-extrabold mb-4">Players</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {players.length === 0 ? (
                <div className="col-span-full text-center text-gray-600 italic py-8">
                  Waiting for legends to join...
                </div>
              ) : (
                players.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 border-4 border-black font-bold flex items-center justify-center pop-in ${
                      readyStates[p.id]
                        ? "bg-marho-green text-white"
                        : "bg-marho-pink text-white"
                    }`}
                    style={{ boxShadow: "4px 4px 0px 0px #000" }}
                  >
                    {p.name} {readyStates[p.id] ? "✓" : ""}
                  </div>
                ))
              )}
            </div>

            <div className="mt-auto">
              <button
                onClick={startGame}
                disabled={players.length === 0 || !allReady || locked}
                className={`w-full py-4 text-xl font-extrabold border-4 border-black shadow-brutal bg-marho-green ${
                  players.length === 0 || !allReady || locked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:brightness-110"
                }`}
              >
                START QUIZ
              </button>
            </div>
          </>
        ) : (
          // Participant waiting view
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-extrabold mb-2">
                You&apos;re in, {name}! 🎮
              </h2>
              <p className="text-lg text-gray-700">
                Wait for the host to start the game. Get your brain ready!
              </p>
            </div>

            {/* Bouncing square loader */}
            <div
              className="w-12 h-12 bg-marho-pink bouncing-square"
              style={{ boxShadow: "6px 6px 0px 0px #000" }}
            />
          </div>
        )}
      </div>

      {/* Back / Debug */}
      <div className="w-full max-w-3xl mt-6 flex justify-between">
        <button
          onClick={() => router.push("/")}
          className="py-2 px-4 border-4 border-black shadow-brutal bg-white font-bold"
        >
          Back
        </button>
        <div className="text-sm text-gray-600">Players: {players.length}</div>
      </div>
    </div>
  );
}
