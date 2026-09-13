import { prisma } from "@/lib/prisma";

export async function stopQuizWhenExpired(quiz: { id: string; createdAt: Date; runtimeStartedAt?: Date | null; durationMinutes: number; runtimeStatus: string }) {
  if (quiz.runtimeStatus !== "RUNNING") return false;
  const startedAt = quiz.runtimeStartedAt || quiz.createdAt;
  const expiresAt = startedAt.getTime() + quiz.durationMinutes * 60 * 1000;
  if (Date.now() < expiresAt) return false;

  const result = await prisma.$transaction(async (transaction) => {
    const stopped = await transaction.quiz.updateMany({
      where: { id: quiz.id, runtimeStatus: "RUNNING" },
      data: { runtimeStatus: "STOPPED", isActive: false, stoppedAt: new Date() },
    });
    if (stopped.count) await transaction.quizLink.deleteMany({ where: { quizId: quiz.id } });
    return stopped;
  });
  return result.count > 0;
}
