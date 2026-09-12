"use client";

import { useEffect, useState, useCallback, use } from "react";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { PlatformMessage } from "@/components/PlatformMessage";

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);

  const [examData, setExamData] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [violations, setViolations] = useState(0);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [startupError, setStartupError] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");

  const submitExam = useCallback(
    async (isDisqualified = false) => {
      if (isSubmitted) return;
      setIsSubmitted(true);

      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: selectedAnswers,
          violations,
          isDisqualified,
        }),
      });

      const data = await res.json();
      setResult(data);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    },
    [quizId, selectedAnswers, violations, isSubmitted]
  );

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/quizzes/${quizId}/start`, { method: "POST" });
      if (!res.ok) {
        setStartupError("Unable to start quiz session.");
        return;
      }
      const data = await res.json();
      setExamData(data);
      setRemainingTime(data.durationMinutes * 60);
      setViolations(data.violations || 0);

      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {}
    }
    init();
  }, [quizId]);

  useEffect(() => {
    if (isSubmitted || !examData) return;

    const registerViolation = (reason: string) => {
      setViolations((prev) => {
        const next = prev + 1;
        setSecurityMessage(`Security warning [${next}/${examData.maxViolations}]: ${reason}`);
        if (next >= examData.maxViolations) {
          submitExam(true);
        }
        return next;
      });
    };

    const handleVisibility = () => {
      if (document.hidden) registerViolation("Tab switch or minimize detected.");
    };

    const handleBlur = () => {
      registerViolation("Window focus lost.");
    };

    const handleKeys = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && ["c", "v", "u", "p", "a"].includes(e.key.toLowerCase())) ||
        (e.metaKey && ["c", "v"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        registerViolation("Clipboard or Inspection keys are restricted.");
      }
    };

    const handleContext = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeys);
    window.addEventListener("contextmenu", handleContext);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeys);
      window.removeEventListener("contextmenu", handleContext);
    };
  }, [examData, isSubmitted, submitExam]);

  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0 || isSubmitted) return;
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev! <= 1) {
          clearInterval(timer);
          submitExam(false);
          return 0;
        }
        return prev! - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingTime, isSubmitted, submitExam]);

  if (result) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl border border-slate-700 text-center">
          {result.isDisqualified ? (
            <div>
              <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-400">Candidate Disqualified</h2>
              <p className="text-xs text-slate-400 mt-2">
                Exceeded proctor tab-switch threshold. Your attempt has been locked with a zero score.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">Exam Submitted</h2>
              <p className="text-sm text-slate-400">Total Authenticated Score:</p>
              <div className="text-5xl font-extrabold my-4 text-white">{result.score}</div>
              <p className="text-xs text-slate-500">Official scorecard dispatched to Department Registry.</p>
            </div>
          )}
          <button
            onClick={() => (window.location.href = "/")}
            className="mt-6 w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!examData) {
    if (startupError) {
      return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4"><div className="w-full max-w-md space-y-4"><PlatformMessage message={startupError} /><Link href="/" className="inline-block text-sm font-medium text-indigo-700 hover:underline">Return to dashboard</Link></div></main>;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Initializing Secure Proctor Environment...
      </div>
    );
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };
  const isFunQuiz = examData.attempt?.quiz?.presentationMode === "FUN";

  return (
    <div className="min-h-screen bg-slate-50 select-none flex flex-col">
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="font-bold text-slate-800 text-base">{examData.quizTitle}</h1>
          <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Violations: {violations} / {examData.maxViolations}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 font-mono text-sm font-bold">
            <Clock className="w-4 h-4 text-indigo-600" />
            {remainingTime !== null ? formatTimer(remainingTime) : "--:--"}
          </div>

          <button
            onClick={() => submitExam(false)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-md shadow-sm"
          >
            Final Submit
          </button>
        </div>
      </header>
      {securityMessage && <div className="mx-auto mt-4 w-full max-w-3xl px-4"><PlatformMessage message={securityMessage} tone="warning" /></div>}

      <main className="max-w-3xl mx-auto w-full px-4 py-8 flex-1">
        <div className="space-y-6">
          {examData.questions.map((q: any, idx: number) => (
            <div key={q.id} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-slate-400">QUESTION {idx + 1}</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                  +{q.marks} Marks
                </span>
              </div>
              <p className="font-medium text-slate-800 mb-4">{q.content}</p>

              <div className={isFunQuiz ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}>
                {q.options.map((opt: any, optionIndex: number) => (
                  <label
                    key={opt.id}
                    style={isFunQuiz ? { animationDelay: `${optionIndex * 140}ms` } : undefined}
                    className={`${isFunQuiz ? "fun-quiz-option" : ""} flex items-center gap-3 p-3 rounded-lg border text-sm cursor-pointer transition ${
                      selectedAnswers[q.id] === opt.id
                        ? "border-indigo-600 bg-indigo-50/40 text-indigo-900"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      value={opt.id}
                      checked={selectedAnswers[q.id] === opt.id}
                      onChange={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: opt.id })}
                      className="text-indigo-600"
                    />
                    <span>{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
