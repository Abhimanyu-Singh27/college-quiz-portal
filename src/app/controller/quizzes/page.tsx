import { requireController } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuizLinkPanel } from "@/components/QuizLinkPanel";
import { QuizDeleteButton } from "@/components/QuizDeleteButton";
import Link from "next/link";

export default async function ControllerQuizzes() {
	const session = await requireController();
	const quizzes = await prisma.quiz.findMany({
		where: { runtimeStatus: { in: ["READY", "RUNNING", "PAUSED"] }, OR: [{ createdBy: { role: "ADMIN" } }, { createdById: session.userId }] },
		include: {
			createdBy: { select: { name: true, role: true } },
			_count: { select: { questions: true, attempts: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl"><Link href="/controller/dashboard" className="text-emerald-700 hover:underline">Back to dashboard</Link><h1 className="mt-4 text-3xl font-bold text-slate-900">Live quizzes</h1><p className="mt-1 text-slate-600">Manage ready, running, and paused quizzes.</p><div className="mt-6 grid gap-5">{quizzes.length ? quizzes.map((quiz) => <section key={quiz.id} className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">{quiz.title}</h2><p className="mt-1 text-sm text-slate-500">Created by {quiz.createdBy.name} ({quiz.createdBy.role})</p><div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600"><span>{quiz._count.questions} questions</span><span>{quiz._count.attempts} attempts</span><span>{quiz.durationMinutes} minutes</span><span>{quiz.runtimeStatus}</span></div></div><div className="flex flex-wrap gap-2"><Link href={`/controller/quizzes/${quiz.id}/control`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Live controls</Link><Link href={`/controller/quizzes/${quiz.id}/monitor`} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:shadow-sm">Live performance</Link>{quiz.createdBy.role === "CONTROLLER" && <QuizDeleteButton quizId={quiz.id} title={quiz.title} />}</div></div><div className="mt-5"><QuizLinkPanel quizId={quiz.id} /></div></section>) : <p className="rounded-lg border bg-white p-6 text-slate-500">No live quizzes available</p>}</div></div></main>;
}
