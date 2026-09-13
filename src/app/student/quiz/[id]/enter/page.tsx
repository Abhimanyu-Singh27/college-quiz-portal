"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  quizType: string;
  teamSize: number | null;
  runtimeStatus: "READY" | "RUNNING" | "PAUSED" | "STOPPED" | "COMPLETED";
}

export default function StudentQuizEntryPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [teamName, setTeamName] = useState("");
  const [isTeam, setIsTeam] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const previousStatus = useRef<Quiz["runtimeStatus"] | null>(null);

  useEffect(() => {
    // Fetch quiz details
    let cancelled = false;
    let timer: number | undefined;
    const fetchQuiz = async () => {
      try {
        const response = await fetch(`/api/quizzes/${quizId}?sync=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Quiz not found");
        const data = await response.json();
        setQuiz(data);
        if (previousStatus.current === "PAUSED" && ["READY", "RUNNING"].includes(data.runtimeStatus)) setResumeCountdown(5);
        if (data.runtimeStatus === "PAUSED") setResumeCountdown(null);
        previousStatus.current = data.runtimeStatus;
        const requestedMode = new URLSearchParams(window.location.search).get("mode");
        setIsTeam(data.quizType === "TEAM" && requestedMode !== "individual");
      } catch (err) {
        setError("Failed to load quiz");
      }
    };

    void fetchQuiz();
    timer = window.setInterval(() => {
      if (!cancelled && document.visibilityState === "visible") void fetchQuiz();
    }, 2000);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [quizId]);

  useEffect(() => {
    if (resumeCountdown === null) return;
    const timer = window.setInterval(() => {
      setResumeCountdown((seconds) => {
        if (seconds === null || seconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resumeCountdown]);

  const handleStart = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (quiz?.runtimeStatus === "PAUSED" || quiz?.runtimeStatus === "STOPPED" || (resumeCountdown !== null && resumeCountdown !== 0)) return;

    if (isTeam && !teamName.trim()) {
      setError("Team name is required for team quizzes");
      return;
    }

    setIsLoading(true);

    try {
      const mode = isTeam ? "team" : "individual";
      const params = new URLSearchParams({
        mode,
        ...(new URLSearchParams(window.location.search).get("visitId") ? { visitId: new URLSearchParams(window.location.search).get("visitId")! } : {}),
        ...(isTeam && { teamName }),
      });

      router.push(`/student/quiz/${quizId}/attempt?${params.toString()}`);
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (resumeCountdown !== 0) return;
    setResumeCountdown(null);
    if (quiz?.runtimeStatus === "RUNNING") void handleStart();
  }, [quiz?.runtimeStatus, resumeCountdown]);

  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading quiz...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/student/left" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Leave quiz
        </Link>

        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
            <h1 className="text-2xl font-bold text-white mb-2">{quiz.title}</h1>
            <p className="text-blue-100">Please confirm your entry details to proceed</p>
          </div>

          {/* Form */}
          <form onSubmit={handleStart} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Quiz Type Info */}
            {quiz.runtimeStatus === "PAUSED" && <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center text-amber-800">This quiz is paused by the administrator or controller. Waiting for resume.</div>}
            {resumeCountdown !== null && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center text-emerald-800">Quiz resumed. Starting in {resumeCountdown} seconds...</div>}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Quiz Type: </span>
                {quiz.quizType === "INDIVIDUAL" ? "Individual" : "Team-Based"}
              </p>
              {quiz.quizType === "TEAM" && (
                <p className="text-sm text-blue-800 mt-2">
                  <span className="font-semibold">Team Size: </span>
                  Up to {quiz.teamSize} members
                </p>
              )}
            </div>

            {/* Quiz Type Selection */}
            {quiz.quizType === "TEAM" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Choose Quiz Mode
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="mode"
                        value="individual"
                        checked={!isTeam}
                        onChange={() => {
                          setIsTeam(false);
                          setTeamName("");
                        }}
                        className="w-4 h-4"
                      />
                      <span className="ml-3">
                        <span className="font-medium text-slate-900">Attempt as Individual</span>
                        <p className="text-xs text-slate-600">Take the quiz alone</p>
                      </span>
                    </label>

                    <label className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="mode"
                        value="team"
                        checked={isTeam}
                        onChange={() => setIsTeam(true)}
                        className="w-4 h-4"
                      />
                      <span className="ml-3">
                        <span className="font-medium text-slate-900">Create or Join a Team</span>
                        <p className="text-xs text-slate-600">Collaborate with teammates</p>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Team Name Input */}
                {isTeam && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Team Name
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g., Team A, Dream Squad, etc."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Enter the same team name as your teammates to join a team
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Start Button */}
            <button
              type="submit"
              disabled={isLoading || quiz.runtimeStatus === "PAUSED" || quiz.runtimeStatus === "STOPPED" || resumeCountdown !== null}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Starting Quiz..." : "Start Quiz Now"}
            </button>
          </form>
        </div>

        {/* Important Notes */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">⚠️ Important:</span> Once you start, the quiz timer will begin. Make sure
            you're ready before clicking "Start Quiz Now".
          </p>
        </div>
      </div>
    </div>
  );
}
