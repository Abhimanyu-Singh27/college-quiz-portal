import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { Users, BookOpen, BarChart3, Plus, ArrowRight, AlertCircle } from "lucide-react";

export default async function AdminDashboard() {
  const session = await requireAdmin();

  const [totalControllers, totalQuizzes, totalAttempts, unverifiedControllers] = await Promise.all([
    prisma.user.count({ where: { role: "CONTROLLER", isControllerVerified: true } }),
    prisma.quiz.count(),
    prisma.quizAttempt.count(),
    prisma.user.count({ where: { role: "CONTROLLER", isControllerVerified: false } }),
  ]);

  const controllers = await prisma.user.findMany({
    where: { role: "CONTROLLER", isControllerVerified: true },
    select: { id: true, name: true, quiznexaId: true, createdAt: true },
    take: 5,
  });

  const recentQuizzes = await prisma.quiz.findMany({
    select: {
      id: true,
      title: true,
      createdBy: { select: { name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar user={session} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Welcome back, {session.name}. Manage your portal here.</p>
          <p className="mt-1 text-sm font-medium text-amber-700">Your QuizNexa ID: {session.quiznexaId || "Not assigned"}</p>
        </div>

        {/* Verification is shown only when a controller attempts sign-in. */}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Verified Controllers</p>
                <p className="text-3xl font-bold text-amber-700">{totalControllers}</p>
              </div>
              <Users className="w-12 h-12 text-amber-100" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Active Quizzes</p>
                <p className="text-3xl font-bold text-blue-700">{totalQuizzes}</p>
              </div>
              <BookOpen className="w-12 h-12 text-blue-100" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Total Attempts</p>
                <p className="text-3xl font-bold text-emerald-700">{totalAttempts}</p>
              </div>
              <BarChart3 className="w-12 h-12 text-emerald-100" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            href="/admin/controllers/add"
            className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            Add New Controller
          </Link>
          <Link
            href="/admin/quizzes/create"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            Create New Quiz
          </Link>
          <Link
            href="/admin/session-config"
            className="bg-white border border-amber-200 text-amber-700 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-amber-50 transition"
          >
            Configure Sign-in Capacity
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controllers Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Recent Controllers</h2>
            </div>
            <div className="p-6">
              {controllers.length > 0 ? (
                <>
                  <div className="space-y-3 mb-4">
                    {controllers.map((controller) => (
                      <div key={controller.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-800">{controller.name}</p>
                          <p className="text-xs text-slate-500">QuizNexa ID: {controller.quiznexaId || "Not assigned"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/admin/controllers"
                    className="flex items-center justify-center gap-2 w-full py-2 text-amber-700 font-medium hover:bg-amber-50 rounded-lg transition"
                  >
                    View All Controllers <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-500 mb-3">No controllers assigned yet</p>
                  <Link href="/admin/controllers/add" className="text-amber-600 font-medium hover:text-amber-700">
                    Add First Controller
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Quizzes Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Recent Quizzes</h2>
            </div>
            <div className="p-6">
              {recentQuizzes.length > 0 ? (
                <>
                  <div className="space-y-3 mb-4">
                    {recentQuizzes.map((quiz) => (
                      <div key={quiz.id} className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-slate-800">{quiz.title}</p>
                        <p className="text-xs text-slate-500">
                          By {quiz.createdBy.name} • {quiz._count.questions} questions • {quiz._count.attempts} attempts
                        </p>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/admin/quizzes"
                    className="flex items-center justify-center gap-2 w-full py-2 text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition"
                  >
                    View All Quizzes <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-500 mb-3">No quizzes created yet</p>
                  <Link href="/admin/quizzes/create" className="text-blue-600 font-medium hover:text-blue-700">
                    Create First Quiz
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
