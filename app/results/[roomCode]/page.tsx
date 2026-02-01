"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type Player = {
  id: string;
  name: string;
};

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
    // Get results from sessionStorage or localStorage
    const loadResults = () => {
      try {
        const sessionData = sessionStorage.getItem(`session:${roomCode}`);
        const scoresData = localStorage.getItem(`scores:${roomCode}`);
        const answersData = localStorage.getItem(`answers:${roomCode}`);

        if (sessionData && scoresData && answersData) {
          const session = JSON.parse(sessionData);
          const finalScores = JSON.parse(scoresData);
          const answers = JSON.parse(answersData);

          setResults({ session, finalScores, answers });
        }

        // Get current user ID (assuming it's stored somewhere)
        const userId = localStorage.getItem(`userId:${roomCode}`);
        if (userId) setCurrentUserId(userId);
      } catch (error) {
        console.error("Failed to load results:", error);
      }
    };

    loadResults();
  }, [roomCode]);

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-marho-bg">
        <div className="bg-white border-4 border-black shadow-brutal p-8 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Loading Results...</h2>
          <p className="text-gray-700">
            Please wait while we gather the results.
          </p>
        </div>
      </div>
    );
  }

  // Sort players by score
  const sortedPlayers = results.session.players
    .map((player) => ({
      ...player,
      score: results.finalScores[player.id] || 0,
    }))
    .sort((a, b) => b.score - a.score);

  const topThree = sortedPlayers.slice(0, 3);
  const restOfPlayers = sortedPlayers.slice(3);

  // Get current user's answers for personal review
  const userAnswers = currentUserId ? results.answers : {};

  return (
    <div className="min-h-screen p-6 bg-marho-bg">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-4">Winner&apos;s Circle</h1>
          <p className="text-xl text-gray-700">Room Code: {roomCode}</p>
        </div>

        {/* Top 3 Podium */}
        <div className="bg-white border-4 border-black shadow-brutal p-8">
          <h2 className="text-3xl font-extrabold mb-6 text-center">Podium</h2>
          <div className="flex justify-center items-end space-x-4 mb-8">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="text-center">
                <div className="w-20 h-16 bg-gray-300 border-4 border-black flex items-center justify-center font-bold text-xl mb-2">
                  2
                </div>
                <div className="bg-marho-pink border-4 border-black p-4 shadow-brutal">
                  <div className="font-bold text-lg">{topThree[1].name}</div>
                  <div className="text-2xl font-extrabold">
                    {topThree[1].score}
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="text-center">
                <div className="w-24 h-20 bg-yellow-400 border-4 border-black flex items-center justify-center font-bold text-2xl mb-2">
                  1
                </div>
                <div className="bg-marho-yellow border-4 border-black p-6 shadow-brutal">
                  <div className="font-bold text-xl">{topThree[0].name}</div>
                  <div className="text-3xl font-extrabold">
                    {topThree[0].score}
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="text-center">
                <div className="w-20 h-12 bg-orange-400 border-4 border-black flex items-center justify-center font-bold text-lg mb-2">
                  3
                </div>
                <div className="bg-marho-green border-4 border-black p-4 shadow-brutal">
                  <div className="font-bold text-lg">{topThree[2].name}</div>
                  <div className="text-2xl font-extrabold">
                    {topThree[2].score}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Standings */}
        <div className="bg-white border-4 border-black shadow-brutal p-8">
          <h2 className="text-3xl font-extrabold mb-6">Full Standings</h2>
          <div className="space-y-2">
            {restOfPlayers.map((player, index) => (
              <div
                key={player.id}
                className="flex justify-between items-center p-4 border-2 border-black bg-marho-pink"
              >
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-xl">#{index + 4}</span>
                  <span className="font-bold text-lg">{player.name}</span>
                </div>
                <span className="font-extrabold text-2xl">{player.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Review */}
        {currentUserId && (
          <div className="bg-white border-4 border-black shadow-brutal p-8">
            <h2 className="text-3xl font-extrabold mb-6">Your Performance</h2>
            <div className="space-y-4">
              {results.session.questions.map((question, index) => {
                const userAnswer = userAnswers[question.id]?.[currentUserId];
                const isCorrect = userAnswer === question.correct_answer;

                return (
                  <div key={question.id} className="border-2 border-black p-4">
                    <div className="mb-2">
                      <span className="font-bold">Question {index + 1}:</span>
                      <span
                        className="ml-2"
                        dangerouslySetInnerHTML={{ __html: question.question }}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <div
                        className={`p-2 border-2 ${userAnswer === question.correct_answer ? "bg-green-200 border-green-500" : "bg-red-200 border-red-500"}`}
                      >
                        <span className="font-bold">Your Answer:</span>
                        <span
                          className="ml-2"
                          dangerouslySetInnerHTML={{
                            __html: userAnswer || "No answer",
                          }}
                        />
                      </div>
                      <div className="p-2 border-2 bg-green-200 border-green-500">
                        <span className="font-bold">Correct Answer:</span>
                        <span
                          className="ml-2"
                          dangerouslySetInnerHTML={{
                            __html: question.correct_answer,
                          }}
                        />
                      </div>
                    </div>
                    <div
                      className={`text-center font-bold text-lg ${isCorrect ? "text-green-600" : "text-red-600"}`}
                    >
                      {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="text-center">
          <button
            onClick={() => router.push("/")}
            className="bg-marho-green border-4 border-black shadow-brutal py-4 px-8 font-bold text-xl hover:brightness-110"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
