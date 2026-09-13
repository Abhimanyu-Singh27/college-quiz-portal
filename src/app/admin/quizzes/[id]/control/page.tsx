"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { QuizLinkPanel } from "@/components/QuizLinkPanel";
import { QuizDeleteButton } from "@/components/QuizDeleteButton";
import { PlatformConfirmDialog } from "@/components/PlatformConfirmDialog";
import { Pause, Play, Square, UserPlus, UserMinus, Users, Activity, Radio, Sparkles } from "lucide-react";
import { PlatformMessage } from "@/components/PlatformMessage";

type QuizData = { id: string; title: string; runtimeStatus: string; isActive: boolean; quizType: string; visits: { id: string; name: string; status: string; joinedAt: string }[]; teams: { id: string; name: string; members: { user: { id: string; name: string; email: string } }[] }[]; attempts: { id: string; score: number; user?: { id: string; name: string; email: string } | null; team?: { id: string; name: string } | null }[] };

export default function QuizControlPage({ params }: { params: Promise<{ id: string }> }) {
  const pathname = usePathname();
  const isController = pathname.startsWith("/controller/");
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [quizId, setQuizId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"controls" | "live">("controls");
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
  const liveParticipants = ["STOPPED", "COMPLETED"].includes(quiz.runtimeStatus)
    ? []
    : quiz.visits.filter((visit) => ["JOINED", "ENTERED"].includes(visit.status));
  const participantWords = liveParticipants.flatMap((visit) => visit.name.trim().split(/\s+/).filter(Boolean));

  return <main className="min-h-screen bg-slate-50 p-6">{pendingAction && <PlatformConfirmDialog message="Are you sure you want to perform this action?" onCancel={() => setPendingAction(null)} onConfirm={() => { const action = pendingAction; setPendingAction(null); void executeControl(action.action, action.extra); }} />}<div className="max-w-5xl mx-auto space-y-6">{message && <PlatformMessage message={message} tone={message.includes("successfully") ? "success" : "error"} />}
    <header><Link href={isController ? "/controller/quizzes" : "/admin/quizzes"} className="text-sm text-emerald-700 hover:underline">Back to quizzes</Link><p className="mt-3 text-sm text-slate-500">{isController ? "Controller" : "Admin"} / Quiz control</p><h1 className="text-3xl font-bold text-slate-900">{quiz.title}</h1><p className="text-slate-600">Status: {quiz.runtimeStatus}</p></header>
    <nav className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white p-1 touch-pan-x"><div className="flex min-w-max gap-2"><button type="button" onClick={() => setActiveTab("controls")} className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "controls" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}><Activity size={16}/> Live controls</button><button type="button" onClick={() => setActiveTab("live")} className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "live" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}><Radio size={16}/> Live participants <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{liveParticipants.length}</span></button></div></nav>
    {activeTab === "controls" && <><section className="flex flex-wrap gap-3"><button disabled={busy || controlsLocked} title={controlsLocked ? `Quiz is ${quiz.runtimeStatus.toLowerCase()}` : "Pause quiz"} onClick={() => control("pause")} className="px-4 py-2 bg-amber-500 text-white rounded flex gap-2 disabled:opacity-60 disabled:cursor-not-allowed"><Pause size={18}/> Pause</button><button disabled={busy || quiz.runtimeStatus === "STOPPED"} title={quiz.runtimeStatus === "STOPPED" ? "Stopped quizzes are finished" : "Resume quiz"} onClick={() => control("resume")} className="px-4 py-2 bg-emerald-600 text-white rounded flex gap-2 disabled:opacity-60 disabled:cursor-not-allowed"><Play size={18}/> Resume / Continue</button><button disabled={busy || controlsLocked} title={controlsLocked ? `Quiz is ${quiz.runtimeStatus.toLowerCase()}` : "Stop quiz"} onClick={() => control("stop")} className="px-4 py-2 bg-red-600 text-white rounded flex gap-2 disabled:opacity-60 disabled:cursor-not-allowed"><Square size={18}/> Stop</button><Link href={`/${isController ? "controller" : "admin"}/quizzes/${quizId}/monitor`} className="px-4 py-2 bg-slate-900 text-white rounded flex gap-2"><Activity size={18}/> Live analysis</Link></section>
    <div className="flex items-center justify-between"><QuizLinkPanel quizId={quizId} />{!isController && <QuizDeleteButton quizId={quizId} title={quiz.title} />}</div>
    <section className="bg-white border rounded-lg p-5"><h2 className="font-bold mb-3">Live teams and participants</h2>{quiz.teams.map(team => <div key={team.id} className="mt-4 border-t pt-3"><div className="flex justify-between"><div className="font-semibold">{team.name}</div><button onClick={() => control("remove_team", { teamId: team.id })} className="text-red-600 text-sm">Remove team</button></div>{team.members.map(member => <div key={member.user.id} className="flex justify-between max-w-md text-sm mt-2"><span>{member.user.name} ({member.user.email})</span><button onClick={() => control("remove_member", { teamId: team.id, userId: member.user.id })} className="text-red-600"><UserMinus size={16}/></button></div>)}</div>)}</section>
    <section className="bg-white border rounded-lg p-5"><h2 className="font-bold mb-3">Participants</h2>{quiz.attempts.map(attempt => <div key={attempt.id} className="flex justify-between border-b py-2"><span>{attempt.team?.name || attempt.user?.name || "Unknown"}</span><button onClick={() => control(attempt.team ? "remove_team" : "remove_attempt", attempt.team ? { teamId: attempt.team.id } : { attemptId: attempt.id })} className="text-red-600 text-sm">Remove</button></div>)}</section></>}
    {activeTab === "live" && <section className="overflow-hidden rounded-2xl border border-[#b9d8c4] bg-[#172a2d] text-white shadow-lg"><div className="border-b border-white/10 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#63d1ba]"><Sparkles size={15}/> Live room</p><h2 className="mt-2 text-2xl font-bold">Welcome to QuizNexa</h2><p className="mt-2 text-sm text-slate-300">Students appear here as soon as they submit their details and join.</p></div><div className="rounded-xl bg-[#1dbb9b] px-4 py-3 text-center"><p className="text-2xl font-bold">{liveParticipants.length}</p><p className="text-xs text-emerald-50">live now</p></div></div></div><div className="p-6"><div className="flex min-h-48 flex-wrap content-center items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-[#203a3d] p-6 text-center">{liveParticipants.length ? liveParticipants.map((participant, index) => <span key={participant.id} className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${index % 3 === 0 ? "bg-[#e5a83b] text-[#172a2d]" : index % 3 === 1 ? "bg-[#63d1ba] text-[#172a2d]" : "bg-white text-[#172a2d]"}`}>{participant.name}</span>) : <p className="text-sm text-slate-400">Waiting for the first student to join...</p>}</div><div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">{participantWords.length ? participantWords.map((word, index) => <span key={`${word}-${index}`} className="text-lg font-bold text-[#e5a83b]">{word}</span>) : <span className="text-lg font-semibold text-slate-500">Welcome to QuizNexa</span>}</div><div className="mt-6 space-y-2">{liveParticipants.map((participant, index) => <div key={participant.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"><span className="font-medium">{participant.name}</span><span className="text-xs text-[#a9e7d8]">{participant.status === "ENTERED" ? "In quiz" : "Joining"}</span></div>)}</div></div></section>}
  </div></main>;
}