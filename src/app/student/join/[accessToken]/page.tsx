"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

interface QuizInfo {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  quizType: string;
  teamSize: number | null;
  allowIndividualInTeam: boolean;
  runtimeStatus: "READY" | "RUNNING" | "PAUSED" | "STOPPED" | "COMPLETED";
}

export default function JoinQuizPage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [runtimeStatus, setRuntimeStatus] = useState<QuizInfo["runtimeStatus"]>("READY");
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const previousStatus = useRef<QuizInfo["runtimeStatus"] | null>(null);

  useEffect(() => {
    const validateLink = async (accessToken: string, initial = false) => {
      try {
        const response = await fetch(
          `/api/quizzes/join/${accessToken}?sync=${Date.now()}`,
          { method: "GET", cache: "no-store" }
        );

        if (!response.ok) {
          const data = await response.json();
          if (initial) setError(data.error || "Invalid or expired quiz link");
          return;
        }

        const data = await response.json();
        setQuiz(data.quiz);
        setRuntimeStatus(data.quiz.runtimeStatus);
        if (previousStatus.current === "PAUSED" && ["READY", "RUNNING"].includes(data.quiz.runtimeStatus)) setResumeCountdown(5);
        if (data.quiz.runtimeStatus === "PAUSED") setResumeCountdown(null);
        previousStatus.current = data.quiz.runtimeStatus;
        setCanJoin(data.canJoin);
        setAlreadyAttempted(data.alreadyAttempted);
      } catch (err) {
        if (initial) setError("Failed to validate quiz link");
      } finally {
        if (initial) setLoading(false);
      }
    };

    let cancelled = false;
    let timer: number | undefined;
    params.then(({ accessToken }) => {
      void validateLink(accessToken, true);
      timer = window.setInterval(() => {
        if (!cancelled && document.visibilityState === "visible") void validateLink(accessToken);
      }, 2000);
    });
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [params]);

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

  const handleJoinQuiz = async () => {
    try {
      if (runtimeStatus === "PAUSED" || runtimeStatus === "STOPPED" || (resumeCountdown !== null && resumeCountdown !== 0)) return;
      setJoining(true);
      const { accessToken } = await params;
      const response = await fetch(
        `/api/quizzes/join/${accessToken}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: studentName }) }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to join quiz");
        return;
      }

      const data = await response.json();
      // Redirect to quiz
      router.push(data.redirectUrl);
    } catch (err) {
      setError("Failed to join quiz");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (resumeCountdown !== 0) return;
    setResumeCountdown(null);
    if (studentName.trim() && runtimeStatus === "RUNNING") void handleJoinQuiz();
  }, [resumeCountdown, runtimeStatus, studentName]);

  const leaveQuiz = async () => {
    const visitId = new URLSearchParams(window.location.search).get("visitId");
    if (visitId && quiz) await fetch(`/api/quizzes/${quiz.id}/leave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitId }) });
    router.push("/student/quizzes");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-700 font-medium">Validating quiz link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl">
        {error ? (
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-red-500">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-red-900 mb-2">
                  Cannot Join Quiz
                </h2>
                <p className="text-red-700 mb-6">{error}</p>
                <Link
                  href="/student/quizzes"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                >
                  Leave quiz
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : alreadyAttempted ? (
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-amber-500">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-amber-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-amber-900 mb-2">
                  Already Attempted
                </h2>
                <p className="text-amber-700 mb-2">
                  You have already attempted this quiz: <strong>{quiz?.title}</strong>
                </p>
                <p className="text-amber-700 mb-6">
                  Each student can only attempt a quiz once.
                </p>
                <Link
                  href="/student/quizzes"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                >
                  Leave quiz
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : quiz && canJoin ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8">
              <h1 className="text-4xl font-bold mb-2">{quiz.title}</h1>
              <p className="text-indigo-100">{quiz.description}</p>
            </div>

            {/* Quiz Details */}
            <div className="p-8">
              {runtimeStatus === "PAUSED" && <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-amber-800">This quiz is paused by the administrator or controller. Waiting for resume.</div>}
              {resumeCountdown !== null && <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-800">Quiz resumed. Starting in {resumeCountdown} seconds...</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                  <p className="text-indigo-600 font-semibold text-sm mb-1">
                    Duration
                  </p>
                  <p className="text-3xl font-bold text-indigo-900">
                    {quiz.durationMinutes}
                  </p>
                  <p className="text-indigo-700 text-sm">minutes</p>
                </div>

                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <p className="text-green-600 font-semibold text-sm mb-1">
                    Questions
                  </p>
                  <p className="text-3xl font-bold text-green-900">
                    {quiz.totalQuestions}
                  </p>
                  <p className="text-green-700 text-sm">questions</p>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <p className="text-purple-600 font-semibold text-sm mb-1">
                    Type
                  </p>
                  <p className="text-2xl font-bold text-purple-900 capitalize">
                    {quiz.quizType}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 p-6 rounded-lg mb-8 border-l-4 border-blue-500">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Before You Start
                </h3>
                <ul className="text-blue-800 space-y-2 text-sm">
                  <li>✓ Make sure you have a stable internet connection</li>
                  <li>✓ Use a desktop or laptop for the best experience</li>
                  <li>✓ You cannot pause once you start the quiz</li>
                  <li>✓ Review your answers before submitting</li>
                  <li>✓ This quiz can only be attempted once</li>
                </ul>
              </div>

              <div className="mb-4">
                <input required value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Student name" className="w-full border rounded-lg px-4 py-3" />
              </div>

              {/* Join Button */}
              <button
                onClick={handleJoinQuiz}
                disabled={joining || runtimeStatus === "PAUSED" || runtimeStatus === "STOPPED" || resumeCountdown !== null}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting Quiz...
                  </>
                ) : (
                  <>
                    Start Quiz
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <Link
                href="/student/left"
                onClick={(event) => { event.preventDefault(); void leaveQuiz(); }}
                className="block text-center mt-4 text-gray-600 hover:text-gray-900 font-medium"
              >
                Leave the quiz
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
