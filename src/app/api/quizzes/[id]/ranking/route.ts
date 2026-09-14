import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasControllerFeature } from "@/lib/controller-permissions";
import { requestControllerApproval } from "@/lib/controller-approval";
import { adminQuizScope } from "@/lib/admin-scope";

type Medal = { name: string; priority: number; color: string };

const canManage = async (quizId: string, feature: string) => {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "ADMIN" && !(await prisma.quiz.findFirst({ where: { AND: [{ id: quizId }, adminQuizScope(session.userId)] }, select: { id: true } }))) return null;
  return (await hasControllerFeature(session, feature, quizId)) ? session : null;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    select: {
      leaderboardLimit: true,
      leaderboardScope: true,
      medalConfigJson: true,
      attempts: {
        where: { submittedAt: { not: null }, isRemoved: false, isDisqualified: false },
        orderBy: [{ score: "desc" }, { totalTimeSeconds: "asc" }],
        take: 1000,
        include: { user: { select: { id: true, name: true } }, team: { select: { id: true, name: true } } },
      },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  const medals = (JSON.parse(quiz.medalConfigJson) as Medal[]).sort((a, b) => b.priority - a.priority);
  const eligibleAttempts = quiz.attempts.filter((attempt) =>
    quiz.leaderboardScope === "STUDENTS" ? Boolean(attempt.userId) :
    quiz.leaderboardScope === "TEAMS" ? Boolean(attempt.teamId) : true
  );
  const rankings = eligibleAttempts.slice(0, quiz.leaderboardLimit).map((attempt, index) => ({
    rank: index + 1,
    participant: attempt.team?.name || attempt.user?.name || "Unknown",
    participantId: attempt.team?.id || attempt.user?.id,
    score: attempt.score,
    totalTimeSeconds: attempt.totalTimeSeconds,
    medal: medals[index] || null,
  }));
  return NextResponse.json({ leaderboardLimit: quiz.leaderboardLimit, leaderboardScope: quiz.leaderboardScope, medals, rankings });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await canManage(id, "MANAGE_RANKINGS");
  if (!session) return NextResponse.json({ error: "Ranking management is not granted" }, { status: 403 });
  try {
    const body = await req.json();
    const approval = await requestControllerApproval(session, "MANAGE_RANKINGS", { ...body, quizId: id });
    if (!approval.approved) return NextResponse.json({ approvalRequired: true, requestId: approval.requestId, message: "Ranking changes were sent to the administrator for approval." }, { status: 202 });
    const limit = Math.max(1, Math.min(1000, Number(body.leaderboardLimit)));
    const medals = Array.isArray(body.medals) ? body.medals : [];
    const quiz = await prisma.quiz.update({ where: { id }, data: { leaderboardLimit: limit, leaderboardScope: body.leaderboardScope || "BOTH", medalConfigJson: JSON.stringify(medals) } });
    return NextResponse.json({ leaderboardLimit: quiz.leaderboardLimit, leaderboardScope: quiz.leaderboardScope, medals });
  } catch {
    return NextResponse.json({ error: "Invalid ranking configuration" }, { status: 400 });
  }
}