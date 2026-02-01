"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type Player = { id: string; name: string };

type Question = {
  id: number;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  all_answers: string[];
};

type Session = {
  id: string;
  players: Player[];
  questions: Question[];
  settings: {
    category: string;
    numQuestions: number;
    timeLimit: number;
  };
};

type GameResults = {
  session: Session;
  finalScores: { [playerId: string]: number };
  answers: { [questionId: number]: { [playerId: string]: string } };
};

export default function ResultsPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();

  const [results, setResults] = useState<GameResults | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const loadResults = () => {
      try {
        // Updated keys to match our GamePage/Lobby logic
        const sessionData = sessionStorage.getItem(`game_${roomCode}`);
        const scoresData = localStorage.getItem(`scores_${roomCode}`);
        const answersData = localStorage.getItem(`answers_${roomCode}`);
        const userId = localStorage.getItem(`userId_${roomCode}`);

        if (sessionData && scoresData) {
          setResults({
            session: JSON.parse(sessionData),
            finalScores: JSON.parse(scoresData),
            answers: answersData ? JSON.parse(answersData) : {},
          });
        }
        if (userId) setCurrentUserId(userId);
      } catch (error) {
        console.error("Failed to load results:", error);
      }
    };

    loadResults();
  }, [roomCode]);

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F4F2ED]">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] p-8 text-center">
          <h2 className="text-3xl font-black uppercase mb-4">
            Finalizing Scores...
          </h2>
          <div className="w-12 h-12 border-4 border-black border-t-[#00FF99] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const sortedPlayers = results.session.players
    .map((player) => ({
      ...player,
      score: results.finalScores[player.id] || 0,
    }))
    .sort((a, b) => b.score - a.score);

  const topThree = sortedPlayers.slice(0, 3);
  const restOfPlayers = sortedPlayers.slice(3);

  return (
    <div className="min-h-screen p-6 bg-[#F4F2ED] font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-black mb-2 uppercase italic tracking-tighter">
            Podium
          </h1>
          <p className="text-xl font-bold bg-black text-white inline-block px-4 py-1 uppercase">
            Room: {roomCode}
          </p>
        </div>

        {/* Podium Section */}
        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_black] p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-center items-center md:items-end gap-4 md:gap-0">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="flex flex-col items-center w-full md:w-1/3">
                <div className="bg-[#FF0055] text-white p-4 border-4 border-black w-full text-center shadow-[4px_4px_0px_0px_black] mb-2">
                  <p className="font-black text-lg truncate">
                    {topThree[1].name}
                  </p>
                  <p className="text-3xl font-black">{topThree[1].score}</p>
                </div>
                <div className="w-full h-24 bg-gray-200 border-x-4 border-t-4 border-black flex items-center justify-center text-4xl font-black">
                  2
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="flex flex-col items-center w-full md:w-1/3 z-10">
                <div className="bg-[#FFD700] p-6 border-4 border-black w-full text-center shadow-[8px_8px_0px_0px_black] mb-2 scale-110">
                  <p className="font-black text-xl truncate">
                    {topThree[0].name}
                  </p>
                  <p className="text-5xl font-black">{topThree[0].score}</p>
                </div>
                <div className="w-full h-40 bg-white border-x-4 border-t-4 border-black flex items-center justify-center text-6xl font-black">
                  1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="flex flex-col items-center w-full md:w-1/3">
                <div className="bg-[#00FF99] p-4 border-4 border-black w-full text-center shadow-[4px_4px_0px_0px_black] mb-2">
                  <p className="font-black text-lg truncate">
                    {topThree[2].name}
                  </p>
                  <p className="text-3xl font-black">{topThree[2].score}</p>
                </div>
                <div className="w-full h-16 bg-gray-300 border-x-4 border-t-4 border-black flex items-center justify-center text-2xl font-black">
                  3
                </div>
              </div>
            )}
          </div>
          <div className="h-4 bg-black w-full hidden md:block" />
        </div>

        {/* Full Leaderboard */}
        {restOfPlayers.length > 0 && (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] p-6">
            <h2 className="text-2xl font-black uppercase mb-4 italic">
              The Rest of the Pack
            </h2>
            <div className="divide-y-4 divide-black border-t-4 border-black">
              {restOfPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex justify-between items-center py-4 px-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-black text-xl w-8">#{index + 4}</span>
                    <span className="font-bold text-lg">{player.name}</span>
                  </div>
                  <span className="font-black text-2xl">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personal Review */}
        {currentUserId && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black uppercase italic">
              Match History
            </h2>
            <div className="grid gap-4">
              {results.session.questions.map((question, index) => {
                const uAnswer = results.answers[question.id]?.[currentUserId];
                const isCorrect = uAnswer === question.correct_answer;

                return (
                  <div
                    key={question.id}
                    className={`p-6 border-4 border-black shadow-[6px_6px_0px_0px_black] bg-white`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="text-xs font-black uppercase opacity-50">
                          Question {index + 1}
                        </p>
                        <h3
                          className="text-xl font-bold"
                          dangerouslySetInnerHTML={{
                            __html: question.question,
                          }}
                        />
                      </div>
                      <div
                        className={`text-3xl ${isCorrect ? "text-[#00FF99]" : "text-[#FF0055]"}`}
                      >
                        {isCorrect ? "✓" : "✕"}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div
                        className={`p-3 border-2 border-black ${isCorrect ? "bg-[#00FF99]/20" : "bg-[#FF0055]/20"}`}
                      >
                        <p className="text-[10px] font-black uppercase">
                          Your Pick
                        </p>
                        <p
                          className="font-bold"
                          dangerouslySetInnerHTML={{
                            __html: uAnswer || "Timed Out",
                          }}
                        />
                      </div>
                      {!isCorrect && (
                        <div className="p-3 border-2 border-black bg-[#00FF99]/20">
                          <p className="text-[10px] font-black uppercase text-[#008855]">
                            Correct Answer
                          </p>
                          <p
                            className="font-bold"
                            dangerouslySetInnerHTML={{
                              __html: question.correct_answer,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row gap-4 pt-8">
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-6 bg-[#00FF99] border-4 border-black shadow-[8px_8px_0px_0px_black] font-black text-2xl uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
