import { prisma } from "@/lib/prisma";
import { requireAdmin, requireController } from "@/lib/auth";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";

export default async function QuizHistory({ role }: { role: "ADMIN" | "CONTROLLER" }) {
  const session = role === "ADMIN" ? await requireAdmin() : await requireController();
  const quizzes = await prisma.quiz.findMany({
    where: role === "ADMIN"
      ? { runtimeStatus: { notIn: ["READY", "RUNNING", "PAUSED"] } }
      : { runtimeStatus: { notIn: ["READY", "RUNNING", "PAUSED"] }, OR: [{ createdById: session.userId }, { createdBy: { role: "ADMIN" } }] },
    include: {
      createdBy: { select: { name: true } },
      visits: { orderBy: { joinedAt: "desc" } },
      attempts: { select: { id: true, userId: true, user: { select: { name: true, email: true } }, team: { select: { name: true, members: { select: { userId: true } } } }, submittedAt: true, questionsAnswered: true, isRemoved: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const createdCount = quizzes.length;
  const liveCount = 0;
  const completedCount = quizzes.filter((quiz) => ["COMPLETED", "STOPPED"].includes(quiz.runtimeStatus) || quiz.attempts.some((attempt) => attempt.submittedAt)).length;
  for (const quiz of quizzes) {
    const attemptedUserIds = new Set(quiz.attempts.filter((attempt) => attempt.questionsAnswered > 0).flatMap((attempt) => attempt.userId ? [attempt.userId] : attempt.team?.members.map((member) => member.userId) || []));
    quiz.visits = quiz.visits.filter((visit) => Boolean(visit.userId && attemptedUserIds.has(visit.userId)));
  }

  return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-7xl"><BackButton className="text-sm text-emerald-700 hover:underline">Back</BackButton><h1 className="mt-3 text-3xl font-bold text-slate-900">Quiz history</h1><p className="mt-1 text-slate-600">Stopped and completed quiz activity with participant records.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Past quizzes</p><p className="mt-1 text-3xl font-bold text-slate-900">{createdCount}</p></div><div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Live quizzes</p><p className="mt-1 text-3xl font-bold text-emerald-700">{liveCount}</p></div><div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Completed / stopped</p><p className="mt-1 text-3xl font-bold text-blue-700">{completedCount}</p></div></div><div className="mt-6 space-y-5">{quizzes.length ? quizzes.map((quiz) => { const joined = quiz.visits.filter((visit) => visit.status !== "LEFT_EARLY").length; const entered = quiz.visits.filter((visit) => ["ENTERED", "COMPLETED"].includes(visit.status)).length; const completed = quiz.visits.filter((visit) => visit.status === "COMPLETED").length; const earlyLeft = quiz.visits.filter((visit) => visit.status === "LEFT_EARLY").length; const nameOnly = quiz.visits.filter((visit) => visit.status === "LEFT_EARLY" && !visit.enteredAt).length; return <section key={quiz.id} className="rounded-xl border bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">{quiz.title}</h2><p className="mt-1 text-sm text-slate-500">Created by {quiz.createdBy.name} on {quiz.createdAt.toLocaleString()}</p></div><span className="rounded-full border px-3 py-1 text-sm font-medium">{quiz.runtimeStatus}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-5"><p><b>{joined}</b><br/><span className="text-xs text-slate-500">Joined</span></p><p><b>{entered}</b><br/><span className="text-xs text-slate-500">Entered</span></p><p><b>{completed}</b><br/><span className="text-xs text-slate-500">Completed</span></p><p><b>{earlyLeft}</b><br/><span className="text-xs text-slate-500">Left early</span></p><p><b>{nameOnly}</b><br/><span className="text-xs text-slate-500">Name only</span></p></div><div className="mt-5 border-t pt-4"><h3 className="font-semibold text-slate-800">Participant records</h3>{quiz.visits.length ? <div className="mt-3 space-y-2">{quiz.visits.map((visit) => <div key={visit.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><span>{visit.name}{visit.email ? ` (${visit.email})` : ""}</span><span className="font-medium text-slate-600">{visit.status === "LEFT_EARLY" && !visit.enteredAt ? "Name entered, never started" : visit.status.replaceAll("_", " ")}</span></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No participants recorded.</p>}</div><div className="mt-4"><Link href={`/${role.toLowerCase()}/quizzes/${quiz.id}/monitor`} className="rounded-lg border px-4 py-2 text-sm font-medium">View performance</Link></div></section>; }) : <p className="rounded-xl border bg-white p-6 text-slate-500">No quiz records found.</p>}</div></div></main>;
}
