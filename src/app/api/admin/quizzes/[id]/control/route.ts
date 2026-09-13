import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasControllerFeature } from "@/lib/controller-permissions";
import { requestControllerApproval } from "@/lib/controller-approval";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "CONTROLLER")) return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    select: {
      id: true, title: true, runtimeStatus: true, isActive: true, quizType: true,
      visits: { select: { id: true, userId: true, name: true, status: true, joinedAt: true }, orderBy: { joinedAt: "asc" } },
      teams: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } }, attempts: true } },
      attempts: { include: { user: { select: { id: true, name: true, email: true } }, team: { select: { id: true, name: true } } }, orderBy: { score: "desc" } },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  if (!(await hasControllerFeature(session, "CONTROL_QUIZ", id)) && !(await hasControllerFeature(session, "MANAGE_PARTICIPANTS", id))) return NextResponse.json({ error: "Quiz control is not granted by an admin" }, { status: 403 });
  quiz.attempts = quiz.attempts.filter((attempt) => !attempt.isRemoved);
  quiz.teams = quiz.teams.filter((team) => !team.isRemoved);
  return NextResponse.json(quiz, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: quizId } = await params;
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "CONTROLLER")) return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    const body = await req.json();
    const { action, attemptId, teamId, userId, email, teamName, teamSize } = body;
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    const participantAction = ["remove_attempt", "remove_team", "remove_member", "add_team", "add_member"].includes(action);
    const feature = participantAction ? "MANAGE_PARTICIPANTS" : "CONTROL_QUIZ";
    if (!(await hasControllerFeature(session, feature, quizId))) return NextResponse.json({ error: `${feature === "CONTROL_QUIZ" ? "Quiz control" : "Participant management"} is not granted by an admin` }, { status: 403 });
    const approval = await requestControllerApproval(session, `CONTROL_${action.toUpperCase()}`, { ...body, quizId });
    if (!approval.approved) return NextResponse.json({ approvalRequired: true, requestId: approval.requestId, message: "This action was sent to the administrator for approval." }, { status: 202 });

    if (["pause", "resume", "stop"].includes(action)) {
      if (action === "resume" && quiz.runtimeStatus === "STOPPED") {
        return NextResponse.json({ error: "Stopped quizzes are finished and cannot be resumed" }, { status: 409 });
      }
      const status = action === "pause" ? "PAUSED" : action === "resume" ? "RUNNING" : "STOPPED";
      const previous = { runtimeStatus: quiz.runtimeStatus, isActive: quiz.isActive, stoppedAt: quiz.stoppedAt, stoppedById: quiz.stoppedById };
      const updated = await prisma.$transaction(async (transaction) => {
        const result = await transaction.quiz.update({
          where: { id: quizId },
          data: { runtimeStatus: status, isActive: action !== "stop", stoppedAt: action === "stop" ? new Date() : null, stoppedById: action === "stop" ? session.userId : null },
          select: { id: true, runtimeStatus: true, isActive: true },
        });
        if (action === "stop") await transaction.quizLink.deleteMany({ where: { quizId } });
        return result;
      });
      await prisma.auditLog.create({ data: { actorId: session.userId, action: `QUIZ_${action.toUpperCase()}`, targetId: quizId, undoData: JSON.stringify({ type: "quiz", previous }), details: `${action} quiz: ${quiz.title}` } });
      return NextResponse.json(updated);
    }

    if (action === "remove_attempt") {
      if (!attemptId) return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
      const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, quizId } });
      if (!attempt) return NextResponse.json({ error: "Attempt not found for this quiz" }, { status: 404 });
      await prisma.quizAttempt.update({ where: { id: attemptId }, data: { isRemoved: true, removedAt: new Date(), removedById: session.userId } });
      await prisma.auditLog.create({ data: { actorId: session.userId, action: "PARTICIPANT_REMOVED", targetId: attemptId, undoData: JSON.stringify({ type: "attempt" }), details: `Removed participant attempt from quiz: ${quiz.title}` } });
      return NextResponse.json({ success: true });
    }

    if (action === "remove_team") {
      if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });
      const team = await prisma.team.findFirst({ where: { id: teamId, quizId } });
      if (!team) return NextResponse.json({ error: "Team not found for this quiz" }, { status: 404 });
      await prisma.$transaction([
        prisma.team.update({ where: { id: teamId }, data: { isRemoved: true, removedAt: new Date(), removedById: session.userId } }),
        prisma.quizAttempt.updateMany({ where: { quizId, teamId }, data: { isRemoved: true, removedAt: new Date(), removedById: session.userId } }),
      ]);
      await prisma.auditLog.create({ data: { actorId: session.userId, action: "TEAM_REMOVED", targetId: teamId, undoData: JSON.stringify({ type: "team" }), details: `Removed team from quiz: ${quiz.title}` } });
      return NextResponse.json({ success: true });
    }

    if (action === "remove_member") {
      if (!teamId || !userId) return NextResponse.json({ error: "teamId and userId are required" }, { status: 400 });
      const team = await prisma.team.findFirst({ where: { id: teamId, quizId } });
      if (!team) return NextResponse.json({ error: "Team not found for this quiz" }, { status: 404 });
      await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
      await prisma.auditLog.create({ data: { actorId: session.userId, action: "TEAM_MEMBER_REMOVED", targetId: teamId, undoData: JSON.stringify({ type: "member", userId }), details: `Removed a team member from quiz: ${quiz.title}` } });
      return NextResponse.json({ success: true });
    }

    if (action === "add_team") {
      if (!teamName) return NextResponse.json({ error: "teamName is required" }, { status: 400 });
      const team = await prisma.team.create({ data: { quizId, name: teamName, teamSize: Number(teamSize) || quiz.teamSize || 2 } });
      return NextResponse.json(team, { status: 201 });
    }

    if (action === "add_member") {
      if (!teamId || (!userId && !email)) return NextResponse.json({ error: "teamId and student identity are required" }, { status: 400 });
      const student = await prisma.user.findFirst({ where: userId ? { id: userId, role: "STUDENT" } : { email, role: "STUDENT" } });
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      const team = await prisma.team.findFirst({ where: { id: teamId, quizId } });
      if (!team) return NextResponse.json({ error: "Team not found for this quiz" }, { status: 404 });
      const member = await prisma.teamMember.create({ data: { teamId, userId: student.id } });
      return NextResponse.json(member, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin quiz control error:", error);
    return NextResponse.json({ error: "Unable to apply quiz control" }, { status: 500 });
  }
}