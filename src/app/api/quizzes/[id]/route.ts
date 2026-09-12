import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        quizType: true,
        teamSize: true,
        durationMinutes: true,
        runtimeStatus: true,
        isActive: true,
        allowIndividualInTeam: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("Quiz fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "CONTROLLER")) return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  try {
    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({ where: { id }, select: { title: true, createdById: true } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (session.role !== "ADMIN" && quiz.createdById !== session.userId) return NextResponse.json({ error: "You cannot delete this quiz" }, { status: 403 });
    await prisma.$transaction(async (tx) => {
      const attempts = await tx.quizAttempt.findMany({ where: { quizId: id }, select: { id: true } });
      const attemptIds = attempts.map(attempt => attempt.id);
      const teams = await tx.team.findMany({ where: { quizId: id }, select: { id: true } });
      const teamIds = teams.map(team => team.id);
      await tx.quizAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
      await tx.quizAttempt.deleteMany({ where: { quizId: id } });
      await tx.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
      await tx.team.deleteMany({ where: { quizId: id } });
      await tx.quizLink.deleteMany({ where: { quizId: id } });
      await tx.question.deleteMany({ where: { quizId: id } });
      await tx.quiz.delete({ where: { id } });
    });
    await prisma.auditLog.create({ data: { actorId: session.userId, action: "QUIZ_DELETED", details: `Deleted quiz: ${quiz.title}` } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quiz error:", error);
    return NextResponse.json({ error: error instanceof Error ? `Unable to delete quiz: ${error.message}` : "Unable to delete quiz" }, { status: 500 });
  }
}
