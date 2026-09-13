"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StudentLeaveGuard } from "@/components/StudentLeaveGuard";
import { Loader, Clock, Zap, Users, Volume2, Check, AlertCircle } from "lucide-react";

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctAnswer?: string;
}

interface QuizAttempt {
  id: string;
  quiz: {
    title: string;
    totalQuestions: number;
    duration: number;
    resultsDisplayInterval?: number;
    type: "INDIVIDUAL" | "TEAM";
    presentationMode: "NORMAL" | "FUN";
  };
}

interface ProgressMetrics {
  currentScore: number;
  correctAnswers: number;
  wrongAnswers: number;
  questionsAnswered: number;
  totalQuestions: number;
  averageTimePerQuestion: number;
  totalTimeSeconds: number;
  shouldDisplayResults: boolean;
  resultsDisplayInterval: number;
}

export default function QuizAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = params.id as string;

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [progress, setProgress] = useState<ProgressMetrics | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showResults, setShowResults] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [waitingForResume, setWaitingForResume] = useState(false);
  const [quizReady, setQuizReady] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<"READY" | "RUNNING" | "PAUSED" | "STOPPED" | "COMPLETED">("READY");
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const [waitingForTeam, setWaitingForTeam] = useState(false);
  const [teamMembersJoined, setTeamMembersJoined] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [progressSeconds, setProgressSeconds] = useState(10);
  const isFunMode = attempt?.quiz.presentationMode === "FUN";

  const startQuiz = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError("");
    setQuizReady(false);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get("mode") || "individual";
        const teamName = urlParams.get("teamName");
        const visitId = urlParams.get("visitId");

        // Start the quiz
        const startResponse = await fetch(`/api/quizzes/${quizId}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: mode === "team" ? "team" : "individual",
            teamName: mode === "team" ? teamName : undefined,
            visitId: visitId || undefined,
          }),
        });

        const data = await startResponse.json().catch(() => ({}));
        if (startResponse.status === 202 && data.waitingForTeam) {
          setWaitingForTeam(true);
          setTeamMembersJoined(data.teamMembers);
          setTeamSize(data.teamSize);
          setError("");
          return;
        }
        if (!startResponse.ok) {
          if (data.status === "PAUSED" || data.status === "STOPPED") setWaitingForResume(true);
          throw new Error(data.error || "Failed to start quiz");
        }
        const attemptData = data;

        setWaitingForResume(false);
        setWaitingForTeam(false);
        setRuntimeStatus("RUNNING");
        setAttempt(attemptData.attempt);
        setQuestions(attemptData.questions);
        if (attemptData.questions.length > 0) {
          setCurrentQuestion(attemptData.questions[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start quiz. Please try again.");
        console.error(err);
      } finally {
        if (showLoading) setIsLoading(false);
      }
  }, [quizId]);

  // Initialize quiz attempt
  useEffect(() => {
    startQuiz();
  }, [startQuiz]);

  useEffect(() => {
    if (!waitingForTeam) return;
    const checkTeam = () => { void startQuiz(false); };
    const retry = window.setInterval(checkTeam, 2000);
    return () => window.clearInterval(retry);
  }, [startQuiz, waitingForTeam]);

  useEffect(() => {
    let cancelled = false;
    const checkQuizStatus = async () => {
      const response = await fetch(`/api/quizzes/${quizId}`, { cache: "no-store" });
      if (!response.ok) return;
      const quiz = await response.json();
      if (cancelled) return;
      setRuntimeStatus(quiz.runtimeStatus);
      if (["PAUSED", "STOPPED", "COMPLETED"].includes(quiz.runtimeStatus)) {
        setWaitingForResume(true);
        setQuizReady(false);
        setResumeCountdown(null);
        return;
      }
      if (waitingForResume && quiz.isActive && ["READY", "RUNNING"].includes(quiz.runtimeStatus)) setQuizReady(true);
    };
    void checkQuizStatus();
    const retry = window.setInterval(checkQuizStatus, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(retry);
    };
  }, [quizId, waitingForResume]);

  useEffect(() => {
    if (!waitingForResume || !quizReady || resumeCountdown !== null) return;
    setResumeCountdown(5);
    const countdown = window.setInterval(() => {
      setResumeCountdown((seconds) => {
        if (seconds === null || seconds <= 1) {
          window.clearInterval(countdown);
          if (attempt) {
            setWaitingForResume(false);
            setQuizReady(false);
            setRuntimeStatus("RUNNING");
            return null;
          }
          void startQuiz();
          return null;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(countdown);
  }, [attempt, quizReady, resumeCountdown, startQuiz, waitingForResume]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (attempt && !waitingForResume && runtimeStatus === "RUNNING") setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch progress metrics
  const fetchProgress = useCallback(async (): Promise<ProgressMetrics | null> => {
    if (!attempt?.id) return null;

    try {
      const response = await fetch(
        `/api/quizzes/${quizId}/progress?attemptId=${attempt.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
        return data as ProgressMetrics;
      }
    } catch (err) {
      console.error("Failed to fetch progress:", err);
    }
    return null;
  }, [quizId, attempt?.id]);

  useEffect(() => {
    if (!showResults || !progress) return;
    setProgressSeconds(10);
    const timer = window.setInterval(() => {
      setProgressSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          setShowResults(false);
          const nextQuestionIndex = progress.questionsAnswered;
          if (nextQuestionIndex < questions.length) {
            setCurrentQuestionIndex(nextQuestionIndex);
            setCurrentQuestion(questions[nextQuestionIndex]);
            setSelectedAnswer(null);
            setQuestionStartTime(Date.now());
          } else if (attempt) {
            router.push(`/student/quiz/${quizId}/results?attemptId=${attempt.id}`);
          }
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showResults, progress, questions, attempt, quizId, router]);

  const handleAnswerSubmit = async () => {
    if (!selectedAnswer || !currentQuestion || !attempt || waitingForResume || runtimeStatus !== "RUNNING") return;

    setIsSaving(true);
    const timeSpent = (Date.now() - questionStartTime) / 1000;

    try {
      // Submit answer
      const response = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attempt.id,
          questionId: currentQuestion.id,
          answer: selectedAnswer,
          timeSeconds: Math.round(timeSpent),
        }),
      });

      if (!response.ok) throw new Error("Failed to submit answer");

      // Fetch updated progress
      const updatedProgress = await fetchProgress();

      if (updatedProgress?.shouldDisplayResults) {
        setShowResults(true);
        return;
      }

      // Move to the next question using the server-confirmed answer count.
      const nextQuestionIndex = updatedProgress?.questionsAnswered ?? currentQuestionIndex + 1;
      if (nextQuestionIndex < questions.length) {
        setCurrentQuestionIndex(nextQuestionIndex);
        setCurrentQuestion(questions[nextQuestionIndex]);
        setSelectedAnswer(null);
        setQuestionStartTime(Date.now());
      } else {
        // Quiz completed
        setTimeout(() => {
          router.push(`/student/quiz/${quizId}/results?attemptId=${attempt.id}`);
        }, 1000);
      }
    } catch (err) {
      setError("Failed to save answer. Please try again.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <StudentLeaveGuard quizId={quizId} visitId={searchParams.get("visitId") || undefined} />
        <Navbar user={null} studentMode studentQuizId={quizId} studentVisitId={searchParams.get("visitId") || undefined} />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt || !currentQuestion || waitingForResume) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <StudentLeaveGuard quizId={quizId} visitId={searchParams.get("visitId") || undefined} />
        <Navbar user={null} studentMode studentQuizId={quizId} studentVisitId={searchParams.get("visitId") || undefined} />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="max-w-lg px-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-slate-600">
              {waitingForTeam ? `${teamMembersJoined} of ${teamSize} team members have joined. Waiting for the remaining members to start the quiz.` : runtimeStatus === "STOPPED" || runtimeStatus === "COMPLETED" ? "This quiz has been stopped. You can no longer continue." : waitingForResume && quizReady ? `The quiz has resumed. Starting in ${resumeCountdown ?? 5} seconds...` : error || "Quiz not found"}
            </p>
            {waitingForTeam && <div className="mx-auto mt-6 h-3 w-full max-w-sm overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${teamSize ? (teamMembersJoined / teamSize) * 100 : 0}%` }} /></div>}
            {waitingForResume && runtimeStatus === "PAUSED" && <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">The quiz is paused. Waiting for the administrator or controller to resume it.</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <StudentLeaveGuard quizId={quizId} visitId={searchParams.get("visitId") || undefined} />
      {showResults && progress && (
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-950/90 p-6 text-white">
          <div className="w-full max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Progress update</p>
            <h2 className="mt-4 text-4xl font-bold">Question progress</h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div><p className="text-sm text-slate-300">Score</p><p className="mt-2 text-4xl font-bold text-emerald-300">{progress.currentScore}%</p></div>
              <div><p className="text-sm text-slate-300">Correct</p><p className="mt-2 text-3xl font-bold">{progress.correctAnswers}</p></div>
              <div><p className="text-sm text-slate-300">Wrong</p><p className="mt-2 text-3xl font-bold text-rose-300">{progress.wrongAnswers}</p></div>
              <div><p className="text-sm text-slate-300">Answered</p><p className="mt-2 text-3xl font-bold">{progress.questionsAnswered}/{progress.totalQuestions}</p></div>
              <div><p className="text-sm text-slate-300">Avg time</p><p className="mt-2 text-3xl font-bold">{progress.averageTimePerQuestion}s</p></div>
            </div>
            <p className="mt-10 text-sm text-slate-400">Next question starts in {progressSeconds} seconds.</p>
          </div>
        </div>
      )}
      <Navbar user={null} studentMode studentQuizId={quizId} studentVisitId={searchParams.get("visitId") || undefined} />

      <main className={`max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 ${isFunMode ? "pb-40" : ""}`}>
        {/* Header */}
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6 ${isFunMode ? "sticky top-16 z-20" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
              {attempt.quiz.title}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-5 h-5" />
                <span className="font-medium">{formatTime(timeElapsed)}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
              style={{
                width: `${((currentQuestionIndex + 1) / attempt.quiz.totalQuestions) * 100}%`,
              }}
            />
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Question {currentQuestionIndex + 1} of {attempt.quiz.totalQuestions}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Question Section */}
          <div className="lg:col-span-2">
            <div className={`${isFunMode ? "bg-blue-50/70 border-blue-200" : "bg-white border-slate-200"} rounded-xl border shadow-sm p-4 sm:p-8`}>
              {/* Question Text */}
              <div className="mb-8">
                <p className="text-lg sm:text-xl font-semibold text-slate-900 mb-6 leading-relaxed">
                  {currentQuestion.text}
                </p>

                {/* Options */}
                <div className={isFunMode ? "fixed inset-x-3 bottom-3 z-30 grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white/95 backdrop-blur border border-blue-200 rounded-2xl shadow-2xl sm:inset-x-6 sm:bottom-6 lg:static lg:grid-cols-1 lg:p-0 lg:bg-transparent lg:border-0 lg:shadow-none" : "space-y-3"}>
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedAnswer(option.id)}
                      disabled={isSaving || waitingForResume || runtimeStatus !== "RUNNING"}
                      className={`w-full min-h-14 p-3 sm:p-4 text-left rounded-lg border-2 transition touch-manipulation ${
                        selectedAnswer === option.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-slate-50 hover:border-blue-300"
                      } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedAnswer === option.id
                              ? "border-blue-500 bg-blue-500"
                              : "border-slate-300"
                          }`}
                        >
                          {selectedAnswer === option.id && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="font-medium text-slate-900">
                          {option.text}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleAnswerSubmit}
                disabled={!selectedAnswer || isSaving || waitingForResume || runtimeStatus !== "RUNNING"}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
              >
                {isSaving && <Loader className="w-5 h-5 animate-spin" />}
                {currentQuestionIndex + 1 === attempt.quiz.totalQuestions
                  ? "Submit Quiz"
                  : "Next Question"}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Statistics Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">Quiz Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Type</span>
                  <span className="font-medium text-slate-900">
                    {attempt.quiz.type === "TEAM" ? "Team" : "Individual"} · {isFunMode ? "Fun" : "Normal"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Questions</span>
                  <span className="font-medium text-slate-900">
                    {attempt.quiz.totalQuestions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Duration</span>
                  <span className="font-medium text-slate-900">
                    {attempt.quiz.duration} mins
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Elapsed</span>
                  <span className="font-medium text-slate-900">
                    {formatTime(timeElapsed)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tip Card */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <p className="text-sm text-blue-900">
                💡 Read each question carefully before selecting your answer. You can't go back!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
