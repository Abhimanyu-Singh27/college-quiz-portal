import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ControllerList } from "@/components/ControllerList";

export default async function AdminControllers() {
  const session = await requireAdmin();

  const controllers = await prisma.user.findMany({
    where: { role: "CONTROLLER", isControllerVerified: true },
    select: {
      id: true,
      name: true,
      quiznexaId: true,
      createdAt: true,
      createdQuizzes: { select: { id: true } },
      assignedTasks: { select: { id: true, status: true } },
      ratings: { select: { rating: true } },
      auditLogs: { select: { id: true, action: true, details: true, timestamp: true, targetId: true, undoData: true, undoneAt: true }, orderBy: { timestamp: "desc" }, take: 10 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50">
      <Navbar user={session} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/dashboard" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-3">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Manage Controllers</h1>
            <p className="text-slate-600 mt-1">Assign controllers to manage quizzes and monitor exams</p>
          </div>
          <Link
            href="/admin/controllers/add"
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            + Add Controller
          </Link>
        </div>

        <ControllerList initialControllers={await Promise.all(controllers.map(async controller => { const quizIds = controller.auditLogs.filter(log => log.action.startsWith("QUIZ_") && log.targetId).map(log => log.targetId!); const existingQuizIds = new Set((await prisma.quiz.findMany({ where: { id: { in: quizIds } }, select: { id: true } })).map(quiz => quiz.id)); return { ...controller, completedTasks: controller.assignedTasks.filter(task => task.status === "COMPLETED").length, averageRating: controller.ratings.length ? controller.ratings.reduce((sum, item) => sum + item.rating, 0) / controller.ratings.length : 0, createdAt: controller.createdAt.toISOString(), activity: controller.auditLogs.map(log => ({ ...log, quizExists: !log.action.startsWith("QUIZ_") || existingQuizIds.has(log.targetId || ""), timestamp: log.timestamp.toISOString(), undoneAt: log.undoneAt?.toISOString() || null })) }; }))} />
      </main>
    </div>
  );
}
