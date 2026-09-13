import { requireStudentAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { Trophy, Target, Clock, Zap, XCircle } from "lucide-react";

interface ResultsPageProps {
  searchParams: Promise<{ attemptId: string }>;
}

export default async function QuizResultsPage({ searchParams }: ResultsPageProps) {
  const session = await requireStudentAuth();
  const { attemptId } = await searchParams;

  // Fetch attempt details
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          totalQuestions: true,
          durationMinutes: true,
          quizType: true,
        },
      },
      user: { select: { name: true, avatar: true } },
      team: { select: { name: true, members: true } },
      answers: { select: { isCorrect: true } },
    },
  });

  if (!attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar user={session} />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <p className="text-slate-600">Results not found</p>
        </div>
      </div>
    );
  }

  // Calculate score
  const correctCount = attempt.answers.filter((a) => a.isCorrect).length;
  const wrongCount = attempt.answers.length - correctCount;
  const unansweredCount = Math.max(0, attempt.quiz.totalQuestions - attempt.answers.length);
  const score = Math.round((correctCount / attempt.quiz.totalQuestions) * 100);
  const percentage = score;

  // Determine performance level
  let performanceLevel = "Poor";
  let performanceColor = "red";
  let performanceEmoji = "😕";

  if (percentage >= 90) {
    performanceLevel = "Outstanding";
    performanceColor = "emerald";
    performanceEmoji = "🌟";
  } else if (percentage >= 80) {
    performanceLevel = "Excellent";
    performanceColor = "emerald";
    performanceEmoji = "🎉";
  } else if (percentage >= 70) {
    performanceLevel = "Good";
    performanceColor = "blue";
    performanceEmoji = "👍";
  } else if (percentage >= 60) {
    performanceLevel = "Fair";
    performanceColor = "amber";
    performanceEmoji = "📝";
  } else if (percentage >= 40) {
    performanceLevel = "Below Average";
    performanceColor = "orange";
    performanceEmoji = "💪";
  }

  const colorClasses = {
    emerald: "from-emerald-600 to-emerald-700 bg-emerald-50",
    blue: "from-blue-600 to-blue-700 bg-blue-50",
    amber: "from-amber-600 to-amber-700 bg-amber-50",
    orange: "from-orange-600 to-orange-700 bg-orange-50",
    red: "from-red-600 to-red-700 bg-red-50",
  };

  const color = colorClasses[performanceColor as keyof typeof colorClasses];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar user={session} studentQuizId={attempt.quiz.id} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Main Results Card */}
        <div
          className={`bg-gradient-to-br ${color} rounded-2xl shadow-2xl p-12 text-center mb-8 border border-slate-200 relative overflow-hidden`}
        >
          {/* Celebration confetti effect background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full"></div>

          <div className="relative z-10">
            <div className="text-6xl mb-4">{performanceEmoji}</div>

            <h1 className="text-4xl font-bold text-white mb-2">
              {performanceLevel}!
            </h1>

            <p className="text-white/90 text-lg mb-8">
              You completed <strong>{attempt.quiz.title}</strong>
            </p>

            {/* Score Circle */}
            <div className="inline-block mb-8">
              <div className="relative w-48 h-48 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white">
                <div className="text-center">
                  <p className="text-6xl font-bold text-white">{percentage}%</p>
                  <p className="text-white/80 text-sm mt-2">Score</p>
                </div>
              </div>
            </div>

            {/* Correctness Info */}
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 mb-8">
              <p className="text-white text-lg">
                You answered <strong>{correctCount}</strong> out of{" "}
                <strong>{attempt.quiz.totalQuestions}</strong> questions correctly
              </p>
              <p className="mt-2 text-white/90">Correct: {correctCount} · Wrong: {wrongCount} · Unanswered: {unansweredCount}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Correct Answers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Correct Answers</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {correctCount}/{attempt.quiz.totalQuestions}
                </p>
              </div>
            </div>
          </div>

          {/* Wrong Answers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Wrong Answers</p>
                <p className="text-2xl font-bold text-red-600">{wrongCount}</p>
              </div>
            </div>
          </div>

          {/* Time Spent */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Time Spent</p>
                <p className="text-2xl font-bold text-blue-600">
                  {attempt.totalTimeSeconds ? Math.floor(attempt.totalTimeSeconds / 60) : 0}m
                </p>
              </div>
            </div>
          </div>

          {/* Average Speed */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Avg Speed</p>
                <p className="text-2xl font-bold text-purple-600">
                  {attempt.averageTimePerQuestion || 0}s
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Info (if applicable) */}
        {attempt.team && (
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200 p-6 mb-8">
            <h3 className="font-bold text-pink-900 mb-3 flex items-center gap-2">
              👥 Team Result
            </h3>
            <p className="text-pink-800">
              <span className="font-semibold">{attempt.team.name}</span> • {attempt.team.members.length}{" "}
              member{attempt.team.members.length > 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Performance Feedback */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
          <h3 className="font-bold text-slate-900 mb-4">Feedback</h3>

          {percentage >= 80 && (
            <p className="text-slate-700">
              🎓 Excellent work! You've demonstrated strong knowledge of the material. Keep up the great performance!
            </p>
          )}
          {percentage >= 60 && percentage < 80 && (
            <p className="text-slate-700">
              📚 Good effort! Review the topics you found challenging and try again to improve your score. Consistency
              is key!
            </p>
          )}
          {percentage < 60 && (
            <p className="text-slate-700">
              💪 Keep learning! Don't be discouraged. Review the course material and practice more questions. Every
              attempt is a step toward improvement!
            </p>
          )}
        </div>

        <p className="text-center text-sm text-slate-500">Your result will remain visible for 15 seconds before you leave the quiz portal.</p>

        {/* Motivational Section */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold mb-2">Keep Learning!</p>
          <p className="text-sm opacity-90">
            Every quiz is a learning opportunity. Come back soon to test your knowledge again!
          </p>
        </div>
      </main>
      <script dangerouslySetInnerHTML={{ __html: `setTimeout(async function () { await fetch('/api/auth/student-logout', { method: 'POST' }); window.location.replace('/student/left'); }, 15000);` }} />
    </div>
  );
}
