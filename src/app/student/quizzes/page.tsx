import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { BookOpen, Users, Clock, CheckCircle2, ArrowRight } from "lucide-react";

export default async function StudentQuizzesPage() {
  const session = await getStudentSession();

  // Redirect if not student
  if (!session || session.role !== "STUDENT") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Access denied. Please login as a student.</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Get active quizzes
  const quizzes = await prisma.quiz.findMany({
    where: { isActive: true },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar user={session} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome, {session.name}! 👋
          </h1>
          <p className="text-slate-600">Select a quiz to begin your assessment</p>
        </div>

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.length > 0 ? (
            quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 group-hover:from-blue-600 group-hover:to-blue-700 transition">
                  <h3 className="text-lg font-bold text-white">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-blue-100 text-sm mt-1 line-clamp-1">{quiz.description}</p>
                  )}
                </div>

                {/* Content */}
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
                        <Clock className="w-4 h-4" />
                        Duration
                      </div>
                      <span className="font-medium text-slate-900">{quiz.durationMinutes} minutes</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-sm">Quiz Type</span>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                        {quiz.quizType}
                      </span>
                    </div>

                    {quiz.quizType === "TEAM" && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Users className="w-4 h-4" />
                          Team Size
                        </div>
                        <span className="font-medium text-slate-900">{quiz.teamSize} members</span>
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Link
                    href={`/student/quiz/${quiz.id}/enter`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition group-hover:from-blue-600 group-hover:to-blue-700"
                  >
                    Start Quiz <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium mb-2">No Quizzes Available</p>
              <p className="text-slate-500">Check back later for new quizzes</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
