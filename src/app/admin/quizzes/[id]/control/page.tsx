"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { QuizLinkPanel } from "@/components/QuizLinkPanel";
import { QuizDeleteButton } from "@/components/QuizDeleteButton";
import { PlatformConfirmDialog } from "@/components/PlatformConfirmDialog";
import { Pause, Play, Square, UserPlus, UserMinus, Users, Activity } from "lucide-react";
import { PlatformMessage } from "@/components/PlatformMessage";

type QuizData = { id: string; title: string; runtimeStatus: string; isActive: boolean; quizType: string; teams: { id: string; name: string; members: { user: { id: string; name: string; email: string } }[] }[]; attempts: { id: string; score: number; user?: { id: string; name: string; email: string } | null; team?: { id: string; name: string } | null }[] };

export default function QuizControlPage({ params }: { params: Promise<{ id: string }> }) {
  const pathname = usePathname();
  const isController = pathname.startsWith("/controller/");
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [quizId, setQuizId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<{ action: string; extra: Record<string, string> } | null>(null);
  const actionInFlight = useRef(false);
  const controlsLocked = quiz ? ["PAUSED", "STOPPED"].includes(quiz.runtimeStatus) : false;
  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    params.then(({ id }) => {
      setQuizId(id);
      const load = async () => {
        if (actionInFlight.current || document.visibilityState !== "visible") return;
        actionInFlight.current = true;
        try {
          const response = await fetch(`/api/admin/quizzes/${id}/control?sync=${Date.now()}`, { cache: "no-store" });
          if (!cancelled && response.ok) setQuiz(await response.json());
        } finally {
          actionInFlight.current = false;
        }
      };
      void load();
      timer = window.setInterval(() => { void load(); }, 2000);
    });
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      actionInFlight.current = false;
    };
  }, [params]);
  const control = async (action: string, extra: Record<string, string> = {}) => {
    if (["remove_member", "remove_team", "remove_attempt", "stop"].includes(action)) {
      setPendingAction({ action, extra });
      return;
    }
    await executeControl(action, extra);
  };
  const executeControl = async (action: string, extra: Record<string, string> = {}) => {
    setBusy(true);
    actionInFlight.current = true;
    try { const response = await fetch(`/api/admin/quizzes/${quizId}/control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to apply control"); setMessage(action === "pause" ? "Quiz paused successfully." : action === "resume" ? "Quiz resumed successfully." : action === "stop" ? "Quiz stopped successfully." : "Participant action completed successfully."); if (["pause", "resume", "stop"].includes(action) && data.id) { setQuiz(current => current ? { ...current, runtimeStatus: data.runtimeStatus, isActive: data.isActive } : current); } else { const updated = await fetch(`/api/admin/quizzes/${quizId}/control?sync=${Date.now()}`, { cache: "no-store" }); if (updated.ok) setQuiz(await updated.json()); } } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to apply control"); } finally { actionInFlight.current = false; setBusy(false); }
  };
  if (!quiz) return <main className="p-8">Loading quiz controls...</main>;

  return <main className="min-h-screen bg-slate-50 p-6">{pendingAction && <PlatformConfirmDialog message="Are you sure you want to perform this action?" onCancel={() => setPendingAction(null)} onConfirm={() => { const action = pendingAction; setPendingAction(null); void executeControl(action.action, action.extra); }} />}<div className="max-w-5xl mx-auto space-y-6">{message && <PlatformMessage message={message} tone={message.includes("successfully") ? "success" : "error"} />}
    <header><Link href={isController ? "/controller/quizzes" : "/admin/quizzes"} className="text-sm text-emerald-700 hover:underline">Back to quizzes</Link><p className="mt-3 text-sm text-slate-500">{isController ? "Controller" : "Admin"} / Live quiz control</p><h1 className="text-3xl font-bold text-slate-900">{quiz.title}</h1><p className="text-slate-600">Status: {quiz.runtimeStatus}</p></header>
    <section className="flex flex-wrap gap-3"><button disabled={busy || controlsLocked} title={controlsLocked ? `Quiz is ${quiz.runtimeStatus.toLowerCase()}` : "Pause quiz"} onClick={() => control("pause")} className="px-4 py-2 bg-amber-500 text-white rounded flex gap-2 disabled:opacity-60 disabled:cursor-not-allowed"><Pause size={18}/> Pause</button><button disabled={busy} onClick={() => control("resume")} className="px-4 py-2 bg-emerald-600 text-white rounded flex gap-2 disabled:opacity-60"><Play size={18}/> Resume / Continue</button><button disabled={busy || controlsLocked} title={controlsLocked ? `Quiz is ${quiz.runtimeStatus.toLowerCase()}` : "Stop quiz"} onClick={() => control("stop")} className="px-4 py-2 bg-red-600 text-white rounded flex gap-2 disabled:opacity-60 disabled:cursor-not-allowed"><Square size={18}/> Stop</button><Link href={`/${isController ? "controller" : "admin"}/quizzes/${quizId}/monitor`} className="px-4 py-2 bg-slate-900 text-white rounded flex gap-2"><Activity size={18}/> Live analysis</Link></section>
    <div className="flex items-center justify-between"><QuizLinkPanel quizId={quizId} />{!isController && <QuizDeleteButton quizId={quizId} title={quiz.title} />}</div>
    <section className="bg-white border rounded-lg p-5"><h2 className="font-bold mb-3">Live teams and participants</h2>{quiz.teams.map(team => <div key={team.id} className="mt-4 border-t pt-3"><div className="flex justify-between"><div className="font-semibold">{team.name}</div><button onClick={() => control("remove_team", { teamId: team.id })} className="text-red-600 text-sm">Remove team</button></div>{team.members.map(member => <div key={member.user.id} className="flex justify-between max-w-md text-sm mt-2"><span>{member.user.name} ({member.user.email})</span><button onClick={() => control("remove_member", { teamId: team.id, userId: member.user.id })} className="text-red-600"><UserMinus size={16}/></button></div>)}</div>)}</section>
    <section className="bg-white border rounded-lg p-5"><h2 className="font-bold mb-3">Participants</h2>{quiz.attempts.map(attempt => <div key={attempt.id} className="flex justify-between border-b py-2"><span>{attempt.team?.name || attempt.user?.name || "Unknown"}</span><button onClick={() => control(attempt.team ? "remove_team" : "remove_attempt", attempt.team ? { teamId: attempt.team.id } : { attemptId: attempt.id })} className="text-red-600 text-sm">Remove</button></div>)}</section>
  </div></main>;
}