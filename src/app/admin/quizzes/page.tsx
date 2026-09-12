import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { ArrowLeft, BookOpen, Users, Clock } from "lucide-react";
import { PlatformMessage } from "@/components/PlatformMessage";
import { QuizDeleteButton } from "@/components/QuizDeleteButton";

export default async function AdminQuizzes({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const session = await requireAdmin();
  const { message } = await searchParams;

  const quizzes = await prisma.quiz.findMany({
    where: { runtimeStatus: { in: ["READY", "RUNNING", "PAUSED"] } },
    include: {
      createdBy: { select: { name: true, role: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar user={session} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Live Quizzes</h1>
            <p className="text-slate-600 mt-1">Manage quizzes that are ready, running, or paused</p>
            {message && <div className="mt-3"><PlatformMessage message={message} tone="success" /></div>}
          </div>
          <Link
            href="/admin/quizzes/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            + Create Quiz
          </Link>
        </div>

        {/* Quizzes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.length > 0 ? (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white">{quiz.title}</h3>
                  <p className="text-blue-50 text-sm">{quiz.description || "No description"}</p>
                </div>

                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-sm">Created by</span>
                      <span className="font-medium text-slate-900">{quiz.createdBy.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-600">
                        <BookOpen className="w-4 h-4" />
                        Questions
                      </div>
                      <span className="font-bold text-blue-700">{quiz._count.questions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="w-4 h-4" />
                        Attempts
                      </div>
                      <span className="font-bold text-emerald-700">{quiz._count.attempts}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4" />
                        Duration
                      </div>
                      <span className="font-medium text-slate-900">{quiz.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-sm">Quiz Type</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {quiz.quizType}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 flex gap-2">
                    <Link
                      href={`/admin/quizzes/${quiz.id}`}
                      className="flex-1 text-center py-2 bg-blue-50 text-blue-700 font-medium rounded hover:bg-blue-100 transition"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/admin/quizzes/${quiz.id}/monitor`}
                      className="flex-1 text-center py-2 bg-emerald-50 text-emerald-700 font-medium rounded hover:bg-emerald-100 transition"
                    >
                      Live Performance
                    </Link>
                    <QuizDeleteButton quizId={quiz.id} title={quiz.title} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
              <p className="text-slate-600 mb-4">No live quizzes available</p>
              <Link
                href="/admin/quizzes/create"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Create First Quiz
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
