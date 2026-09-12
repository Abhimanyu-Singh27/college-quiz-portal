import { hasControllerFeature } from "@/lib/controller-permissions";
import { PlatformMessage } from "@/components/PlatformMessage";
import { requireController } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Users } from "lucide-react";

export default async function ControllerDashboard({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const session = await requireController();
  const { message } = await searchParams;
  const canCreateQuiz = await hasControllerFeature(session, "CREATE_QUIZ");

  // Get controller's quizzes
  const quizzes = await prisma.quiz.findMany({
    where: { OR: [{ createdById: session.userId }, { createdBy: { role: "ADMIN" } }] },
    include: {
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get assigned tasks
  const tasks = await prisma.task.findMany({
    where: { assignedTo: { OR: [{ id: session.userId }, { email: session.email }] } },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  const activeQuizzes = quizzes.filter((q) => q.isActive).length;
  const totalAttempts = quizzes.reduce((sum, q) => sum + q._count.attempts, 0);
  const quizPermissions = Object.fromEntries(await Promise.all(quizzes.map(async (quiz) => [
    quiz.id,
    {
      canAnalyze: await hasControllerFeature(session, "LIVE_ANALYSIS", quiz.id),
      canManageRankings: await hasControllerFeature(session, "MANAGE_RANKINGS", quiz.id),
    },
  ])));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <Navbar user={session} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Controller Dashboard</h1>
          {message && <PlatformMessage message={message} tone="success" />}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">My Quizzes</p>
                <p className="text-3xl font-bold text-blue-700">{quizzes.length}</p>
              </div>
              <BookOpen className="w-12 h-12 text-blue-100" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Active Quizzes</p>
                <p className="text-3xl font-bold text-emerald-700">{activeQuizzes}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-emerald-100" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Student Attempts</p>
                <p className="text-3xl font-bold text-purple-700">{totalAttempts}</p>
              </div>
              <Users className="w-12 h-12 text-purple-100" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8">
          {canCreateQuiz && (
            <Link
              href="/controller"
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition inline-flex items-center gap-2"
            >
              + Create New Quiz
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Quizzes */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">My Quizzes</h2>
            </div>
            <div className="p-6">
              {quizzes.length > 0 ? (
                <div className="space-y-3">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
                        <div className="flex gap-4 text-xs text-slate-600 mt-1">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {quiz._count.questions} Questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {quiz._count.attempts} Attempts
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {quiz.durationMinutes} min
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            quiz.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {quiz.isActive ? "Active" : "Inactive"}
                        </span>
                        {quizPermissions[quiz.id].canManageRankings && (
                          <Link
                            href={`/controller/quizzes/${quiz.id}/ranking`}
                            className="block mt-2 text-xs text-indigo-700 hover:underline"
                          >
                            Ranking settings
                          </Link>
                        )}
                        {quizPermissions[quiz.id].canAnalyze && (
                          <Link
                            href={`/controller/quizzes/${quiz.id}/monitor`}
                            className="block mt-1 text-xs text-emerald-700 hover:underline"
                          >
                            Live analysis
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-6">No quizzes created yet</p>
              )}
              <Link
                href="/controller/quizzes"
                className="block w-full text-center mt-4 py-2 text-emerald-700 font-medium hover:bg-emerald-50 rounded-lg transition"
              >
                View All Quizzes
              </Link>
            </div>
          </div>

          {/* Assigned Tasks */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Assigned Tasks</h2>
            </div>
            <div className="p-6">
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Status:{" "}
                        <span
                          className={`font-semibold ${
                            task.status === "COMPLETED"
                              ? "text-emerald-600"
                              : task.status === "IN_PROGRESS"
                              ? "text-blue-600"
                              : "text-amber-600"
                          }`}
                        >
                          {task.status}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-6">No tasks assigned</p>
              )}
              <Link
                href="/controller/tasks"
                className="block w-full text-center mt-4 py-2 text-indigo-700 font-medium hover:bg-indigo-50 rounded-lg transition"
              >
                View All Tasks
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
