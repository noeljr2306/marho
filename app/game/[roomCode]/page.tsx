"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

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

let socket: Socket | null = null;
const SOCKET_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : "http://localhost:4000";

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

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
  const [scores, setScores] = useState<{ [playerId: string]: number }>({});
  const [gameEnded, setGameEnded] = useState(false);

  const handleAnswer = (answer: string | null) => {
    if (!session || !socket) return;

    setSelectedAnswer(answer);
    const question = session.questions[currentQuestionIndex];
    const isCorrect = answer === question.correct_answer;

    socket.emit("submit_answer", {
      room: roomCode,
      questionId: question.id,
      answer,
      isCorrect,
    });
  };

  useEffect(() => {
    if (!session) return;

    socket = io(SOCKET_URL);
    socket.emit("join_game", { room: roomCode });

    socket.on(
      "question_ended",
      ({ answers: serverAnswers, scores: serverScores }) => {
        setAnswers(serverAnswers);
        setScores(serverScores);
        setSelectedAnswer(null);
        if (currentQuestionIndex < session.questions.length - 1) {
          setTimeout(() => {
            setCurrentQuestionIndex((prev) => prev + 1);
            setTimeLeft(session.settings.timeLimit);
          }, 3000);
        } else {
          setGameEnded(true);
        }
      },
    );

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [session, roomCode, currentQuestionIndex]);

  useEffect(() => {
    if (timeLeft > 0 && !selectedAnswer) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [timeLeft, selectedAnswer]);

  if (timeLeft === 0 && !selectedAnswer) {
    queueMicrotask(() => handleAnswer(null));
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-marho-bg">
        <div className="bg-white border-4 border-black shadow-brutal p-8 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Game is starting…</h2>
          <p className="text-gray-700">Waiting for session data.</p>
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

  if (gameEnded) {
    return (
      <div className="min-h-screen p-6 bg-marho-bg">
        <div className="max-w-3xl mx-auto bg-white border-4 border-black shadow-brutal p-6 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Game Over!</h1>
          <button
            onClick={() => router.push(`/results/${roomCode}`)}
            className="py-4 px-8 border-4 border-black shadow-brutal bg-marho-green font-bold text-xl"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen p-6 bg-marho-bg">
      <div className="max-w-3xl mx-auto bg-white border-4 border-black shadow-brutal p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-bold">
            Question {currentQuestionIndex + 1} of {session.questions.length}
          </div>
          <div className="text-lg font-bold">Time: {timeLeft}s</div>
        </div>

        {/* Timer Bar */}
        <div className="w-full bg-gray-200 border-2 border-black mb-6">
          <div
            className="bg-marho-pink h-4 transition-all duration-1000"
            style={{
              width: `${(timeLeft / session.settings.timeLimit) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <div className="mb-8">
          <h2
            className="text-2xl font-bold mb-4"
            dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
          />
        </div>

        {/* Answers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {currentQuestion.all_answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(answer)}
              disabled={selectedAnswer !== null}
              className={`p-4 border-4 border-black font-bold text-left transition-all ${
                selectedAnswer === answer
                  ? answer === currentQuestion.correct_answer
                    ? "bg-green-400 text-white"
                    : "bg-red-400 text-white"
                  : selectedAnswer && answer === currentQuestion.correct_answer
                    ? "bg-green-400 text-white"
                    : "bg-marho-yellow hover:bg-yellow-300"
              }`}
              dangerouslySetInnerHTML={{ __html: answer }}
            />
          ))}
        </div>

        {/* Scores */}
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Scores</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {session.players.map((player) => (
              <div
                key={player.id}
                className="p-2 border-2 border-black bg-marho-pink text-white font-bold text-center"
              >
                {player.name}: {scores[player.id] || 0}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
