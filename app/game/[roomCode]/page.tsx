"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

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

const SOCKET_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : "http://localhost:4000";

export default function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();

  const socketRef = useRef<Socket | null>(null);
  const timeoutHandledRef = useRef(false);

  const [socketId, setSocketId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [gameEnded, setGameEnded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    const s = sessionStorage.getItem(`game_${roomCode}`);
    if (s) {
      const parsed = JSON.parse(s);

      setTimeout(() => {
        setSession(parsed);
        setTimeLeft(parsed.settings.timeLimit);
      }, 0);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!session) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);
    }

    const socket = socketRef.current;

    const handleConnect = () => {
      setSocketId(socketRef.current?.id ?? null);
    };

    socket.on("connect", handleConnect);
    if (socket.connected) handleConnect();

    socket.emit("join_game", { room: roomCode });

    socket.on("question_ended", ({ scores: serverScores }) => {
      setScores(serverScores);
      setShowFeedback(true);

      setTimeout(() => {
        timeoutHandledRef.current = false;
        setShowFeedback(false);
        setSelectedAnswer(null);

        if (currentQuestionIndex < session.questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setTimeLeft(session.settings.timeLimit);
        } else {
          setGameEnded(true);
        }
      }, 3000);
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("question_ended");
    };
  }, [session, roomCode, currentQuestionIndex]);

  const handleAnswer = (answer: string | null) => {
    if (!session || !socketRef.current || selectedAnswer) return;

    setSelectedAnswer(answer ?? "TIMED_OUT");

    const question = session.questions[currentQuestionIndex];

    socketRef.current.emit("submit_answer", {
      room: roomCode,
      questionId: question.id,
      answer,
    });
  };

  useEffect(() => {
    if (timeLeft > 0 && !selectedAnswer && !showFeedback) {
      const timer = setTimeout(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, selectedAnswer, showFeedback]);

  useEffect(() => {
    if (timeLeft === 0 && !selectedAnswer && !timeoutHandledRef.current) {
      timeoutHandledRef.current = true;
      setTimeout(() => {
        handleAnswer(null);
      }, 0);
    }
  }, [timeLeft, selectedAnswer]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F4F2ED]">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] p-8 text-center">
          <h2 className="text-3xl font-black uppercase mb-4">
            Initializing...
          </h2>
          <div className="w-12 h-12 border-4 border-black border-t-[#FF0055] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (gameEnded) {
    return (
      <div className="min-h-screen p-6 bg-[#F4F2ED] flex items-center justify-center">
        <div className="max-w-3xl w-full bg-white border-4 border-black shadow-[12px_12px_0px_0px_black] p-12 text-center">
          <h1 className="text-6xl font-black mb-8 uppercase italic">Fin!</h1>
          <button
            onClick={() => router.push(`/results/${roomCode}`)}
            className="w-full py-6 bg-[#00FF99] border-4 border-black shadow-[8px_8px_0px_0px_black] font-black text-2xl uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen p-6 bg-[#F4F2ED] font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Top Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border-4 border-black p-4 text-center shadow-[4px_4px_0px_0px_black]">
            <p className="text-xs font-bold uppercase opacity-50">Progress</p>
            <p className="text-xl font-black">
              {currentQuestionIndex + 1}/{session.questions.length}
            </p>
          </div>

          <div className="bg-[#FF0055] border-4 border-black p-4 text-center text-white shadow-[4px_4px_0px_0px_black]">
            <p className="text-xs font-bold uppercase opacity-80">
              Seconds Left
            </p>
            <p className="text-2xl font-black">{timeLeft}s</p>
          </div>

          <div className="bg-[#FFD700] border-4 border-black p-4 text-center shadow-[4px_4px_0px_0px_black]">
            <p className="text-xs font-bold uppercase opacity-50">Score</p>
            <p className="text-xl font-black">
              {socketId ? (scores[socketId] ?? 0) : 0}
            </p>
          </div>
        </div>

        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_black] p-8 mb-8 relative overflow-hidden">
          {showFeedback && (
            <div
              className={`absolute inset-0 z-10 flex items-center justify-center text-6xl font-black uppercase italic ${
                selectedAnswer === currentQuestion.correct_answer
                  ? "text-[#00FF99]"
                  : "text-[#FF0055]"
              } bg-white/90`}
            >
              {selectedAnswer === currentQuestion.correct_answer
                ? "Correct!"
                : "Wrong!"}
            </div>
          )}

          <h2
            className="text-3xl md:text-4xl font-black"
            dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentQuestion.all_answers.map((answer, index) => {
            const isCorrect = answer === currentQuestion.correct_answer;
            const isSelected = selectedAnswer === answer;

            let btnClass = "bg-white";
            if (showFeedback) {
              if (isCorrect) btnClass = "bg-[#00FF99]";
              else if (isSelected) btnClass = "bg-[#FF0055] text-white";
              else btnClass = "opacity-50 grayscale";
            } else if (isSelected) {
              btnClass = "bg-[#FFD700]";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(answer)}
                disabled={!!selectedAnswer || showFeedback}
                className={`p-6 border-4 border-black text-xl font-black text-left shadow-[6px_6px_0px_0px_black] transition-all ${btnClass}`}
                dangerouslySetInnerHTML={{ __html: answer }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
