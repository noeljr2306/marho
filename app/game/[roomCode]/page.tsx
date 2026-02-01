"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type Player = {
  id: string;
  name: string;
};

type Question = {
  q: string;
};

type Session = {
  id: string;
  players: Player[];
  questions: Question[];
};

export default function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();

  const [session] = useState<Session | null>(() => {
    try {
      const s = sessionStorage.getItem(`session:${roomCode}`);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-marho-bg">
        <div className="bg-white border-4 border-black shadow-brutal p-8 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Game is starting…</h2>
          <p className="text-gray-700">
            Waiting for session data.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push(`/lobby/${roomCode}`)}
              className="py-2 px-4 border-4 border-black shadow-brutal bg-white font-bold"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-marho-bg">
      <div className="max-w-3xl mx-auto bg-white border-4 border-black shadow-brutal p-6">
        <h1 className="text-4xl font-extrabold mb-4">
          Session: {session.id}
        </h1>

        <h2 className="text-2xl font-bold mb-2">Players</h2>
        <ul className="grid grid-cols-2 gap-2 mb-4">
          {session.players.map(p => (
            <li
              key={p.id}
              className="p-2 border-2 border-black font-bold bg-marho-pink text-white"
            >
              {p.name}
            </li>
          ))}
        </ul>

        <h2 className="text-2xl font-bold mb-2">First Question</h2>
        <div className="p-4 border-4 border-black bg-marho-yellow font-bold">
          {session.questions[0].q}
        </div>
      </div>
    </div>
  );
}
