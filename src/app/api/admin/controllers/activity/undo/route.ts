import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  const session = await requireAdmin();

  try {
    const { activityId } = await request.json();
    const activity = await prisma.auditLog.findUnique({ where: { id: activityId } });
    if (!activity || !activity.undoData || activity.undoneAt) return NextResponse.json({ error: "Activity cannot be undone" }, { status: 400 });
    if (activity.targetId && activity.action.startsWith("QUIZ_")) {
      const quiz = await prisma.quiz.findUnique({ where: { id: activity.targetId }, select: { id: true } });
      if (!quiz) return NextResponse.json({ error: "This activity cannot be undone because the quiz no longer exists" }, { status: 410 });
      const newerQuizActivity = await prisma.auditLog.findFirst({
        where: {
          targetId: activity.targetId,
          action: { startsWith: "QUIZ_" },
          timestamp: { gt: activity.timestamp },
        },
        select: { id: true },
      });
      if (newerQuizActivity) return NextResponse.json({ error: "Only the current quiz activity can be undone" }, { status: 409 });
    }
    const undo = JSON.parse(activity.undoData) as { type: string; previous?: { runtimeStatus: string; isActive: boolean; stoppedAt: string | Date | null; stoppedById: string | null }; userId?: string };
    if (undo.type === "attempt") {
      const restored = await prisma.quizAttempt.updateMany({ where: { id: activity.targetId!, isRemoved: true }, data: { isRemoved: false, removedAt: null, removedById: null } });
      if (!restored.count) return NextResponse.json({ error: "The participant attempt is already restored or no longer exists" }, { status: 404 });
    } else if (undo.type === "team") {
      const restored = await prisma.team.updateMany({ where: { id: activity.targetId!, isRemoved: true }, data: { isRemoved: false, removedAt: null, removedById: null } });
      if (!restored.count) return NextResponse.json({ error: "The team is already restored or no longer exists" }, { status: 404 });
      await prisma.quizAttempt.updateMany({ where: { teamId: activity.targetId!, isRemoved: true }, data: { isRemoved: false, removedAt: null, removedById: null } });
    } else if (undo.type === "member") {
      if (!undo.userId) return NextResponse.json({ error: "The removed member could not be identified" }, { status: 400 });
      await prisma.teamMember.upsert({ where: { teamId_userId: { teamId: activity.targetId!, userId: undo.userId } }, update: {}, create: { teamId: activity.targetId!, userId: undo.userId } });
    }
    else if (undo.type === "quiz" && undo.previous) await prisma.quiz.update({ where: { id: activity.targetId! }, data: { ...undo.previous, stoppedAt: undo.previous.stoppedAt ? new Date(undo.previous.stoppedAt) : null } as Prisma.QuizUpdateInput });
    else return NextResponse.json({ error: "Unsupported activity" }, { status: 400 });
    await prisma.auditLog.update({ where: { id: activity.id }, data: { undoneAt: new Date() } });
    await prisma.auditLog.create({ data: { actorId: session.userId, action: "ACTIVITY_UNDONE", targetId: activity.id, details: `Undid activity: ${activity.action}` } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Controller activity undo error:", error);
    return NextResponse.json({ error: "Unable to undo this activity" }, { status: 500 });
  }
}