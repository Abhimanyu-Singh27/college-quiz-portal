import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, CheckCircle2, Users, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { adminQuizScope } from "@/lib/admin-scope";

export default async function AdminAnalytics() {
  const session = await requireAdmin();
  const [quizzes, participants, submitted, topScores] = await Promise.all([
    prisma.quiz.findMany({ where: adminQuizScope(session.userId), select: { title: true, _count: { select: { attempts: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.quizAttempt.count({ where: { isRemoved: false, quiz: adminQuizScope(session.userId) } }),
    prisma.quizAttempt.count({ where: { submittedAt: { not: null }, isRemoved: false, quiz: adminQuizScope(session.userId) } }),
    prisma.quizAttempt.findMany({ where: { submittedAt: { not: null }, isRemoved: false, quiz: adminQuizScope(session.userId) }, orderBy: { score: "desc" }, take: 5, select: { score: true, user: { select: { name: true } }, team: { select: { name: true } } } }),
  ]);
  const maxAttempts = Math.max(...quizzes.map(quiz => quiz._count.attempts), 1);
  const metrics: Array<[string, string | number, LucideIcon]> = [["Quizzes", quizzes.length, BarChart3], ["Participants", participants, Users], ["Submitted", submitted, CheckCircle2], ["Completion", participants ? `${Math.round(submitted / participants * 100)}%` : "0%", Trophy]];
  return <main className="min-h-screen bg-slate-50 p-6"><div className="max-w-6xl mx-auto space-y-6"><header><Link href="/admin/dashboard" className="text-sm text-amber-700 hover:underline">Back to admin dashboard</Link><h1 className="mt-3 text-3xl font-bold text-slate-900">Analytics</h1></header><section className="grid grid-cols-2 lg:grid-cols-4 gap-4">{metrics.map(([label, value, Icon]) => <div key={label} className="bg-white border rounded-xl p-5"><Icon className="text-emerald-600 mb-3" size={20}/><p className="text-sm text-slate-500">{label}</p><p className="text-3xl font-bold text-slate-900">{value}</p></div>)}</section><section className="grid lg:grid-cols-2 gap-6"><div className="bg-white border rounded-xl p-6"><h2 className="font-semibold mb-5">Quiz participation</h2>{quizzes.map(quiz => <div key={quiz.title} className="mb-4"><div className="flex justify-between text-sm mb-1"><span>{quiz.title}</span><b>{quiz._count.attempts}</b></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${quiz._count.attempts / maxAttempts * 100}%` }}/></div></div>)}</div><div className="bg-white border rounded-xl p-6"><h2 className="font-semibold mb-5">Top performers</h2>{topScores.map((score, index) => <div key={index} className="flex justify-between border-b py-3"><span>{score.team?.name || score.user?.name || "Participant"}</span><b className="text-emerald-700">{score.score}%</b></div>)}</div></section></div></main>;
}
