"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

// Ensure this matches your server port
const socket = io("http://localhost:4000");

export default function Page() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Listen for server validation errors
    socket.on("room_not_found", (data) => {
      setError(data.message || "Room not found!");
    });

    // Listen for successful join to navigate
    socket.on("join_success", () => {
      router.push(`/lobby/${roomCode}?name=${nickname}`);
    });

    return () => {
      socket.off("room_not_found");
      socket.off("join_success");
    };
  }, [roomCode, nickname, router]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Reset error state

    if (roomCode && nickname) {
      // 1. Emit join event to server for validation
      socket.emit("join_room", {
        room: roomCode,
        player: { name: nickname },
      });
    }
  };

  const handleHost = () => {
    const newRoomCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    // 2. Tell the server to initialize this room
    socket.emit("create_room", {
      room: newRoomCode,
      settings: { category: "General Knowledge", numQuestions: 10 },
    });

    console.log("Hosting room:", newRoomCode);
    router.push(`/lobby/${newRoomCode}?host=true&name=Host`);
  };

  return (
    <div className="min-h-screen bg-marho-bg flex flex-col items-center justify-center p-4 font-sans text-black">
      <h1 className="text-6xl font-black mb-12 text-sky-500 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] uppercase tracking-tighter">
        Marho
      </h1>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* HOST BOX */}
        <div className="bg-marho-yellow border-4 border-black shadow-brutal-lg p-8 flex flex-col items-center justify-center transform transition-transform hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-3xl font-bold mb-6 uppercase">Host a Game</h2>
          <p className="text-lg font-medium mb-8 text-center">
            Create a room and challenge your friends!
          </p>
          <button
            onClick={handleHost}
            className="w-full cursor-pointer bg-white border-4 border-black py-4 text-xl font-bold shadow-brutal hover:bg-gray-100 active:translate-y-1 active:shadow-none transition-all"
          >
            Create Room
          </button>
        </div>

        {/* JOIN BOX */}
        <div className="bg-marho-green border-4 border-black shadow-brutal-lg p-8 flex flex-col items-center justify-center transform transition-transform hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-3xl font-bold mb-6 uppercase">Join Game</h2>
          <form onSubmit={handleJoin} className="w-full space-y-4">
            {error && (
              <div className="bg-red-500 text-white border-2 border-black p-2 font-bold text-center animate-pulse">
                {error}
              </div>
            )}
            <div>
              <input
                type="text"
                placeholder="ROOM CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full p-4 border-4 border-black text-xl font-bold placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-marho-pink shadow-brutal"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="NICKNAME"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                className="w-full p-4 border-4 border-black text-xl font-bold placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-marho-pink shadow-brutal"
              />
            </div>
            <button
            onClick={handleJoin}
              type="submit"
              className="w-full cursor-pointer bg-marho-pink text-black border-4 border-black py-4 text-xl font-bold shadow-brutal hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
            >
              Enter Lobby
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
