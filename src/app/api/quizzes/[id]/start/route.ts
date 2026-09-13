import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";
import { stopQuizWhenExpired } from "@/lib/quiz-runtime";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getStudentSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: quizId } = await params;
    const { teamName, mode, visitId } = await req.json();
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { questions: true } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (await stopQuizWhenExpired(quiz)) quiz.runtimeStatus = "STOPPED";
    if (["PAUSED", "STOPPED"].includes(quiz.runtimeStatus)) {
      const activity = await prisma.auditLog.findFirst({ where: { targetId: quizId, action: { in: ["QUIZ_PAUSE", "QUIZ_STOP"] } }, orderBy: { timestamp: "desc" }, include: { actor: { select: { name: true, role: true } } } });
      const state = quiz.runtimeStatus === "PAUSED" ? "paused" : "stopped";
      const actor = activity?.actor ? `${activity.actor.name} (${activity.actor.role.toLowerCase()})` : "an administrator or controller";
      return NextResponse.json({ error: `Quiz is ${state} by ${actor}. Please wait for resume.`, status: quiz.runtimeStatus }, { status: 409 });
    }
    if (!quiz.isActive || quiz.runtimeStatus === "COMPLETED") return NextResponse.json({ error: "This quiz is no longer accepting attempts" }, { status: 409 });

    let attempt;
    if (quiz.quizType === "TEAM" && !(mode === "individual" && quiz.allowIndividualInTeam)) {
      if (!teamName?.trim()) return NextResponse.json({ error: "Team name is required" }, { status: 400 });
      const normalizedTeamName = teamName.trim();
      let team = await prisma.team.findFirst({ where: { quizId, name: normalizedTeamName } });
      if (team?.isRemoved) return NextResponse.json({ error: "This team was removed" }, { status: 409 });
      if (!team) team = await prisma.team.create({ data: { quizId, name: normalizedTeamName, teamSize: quiz.teamSize || 2 } });
      const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: team.id, userId: session.userId } } });
      if (!member && await prisma.teamMember.count({ where: { teamId: team.id } }) >= team.teamSize) return NextResponse.json({ error: `This team is full at ${team.teamSize} members. Please create another team.` }, { status: 409 });
      if (!member) await prisma.teamMember.create({ data: { teamId: team.id, userId: session.userId } });
      const memberCount = await prisma.teamMember.count({ where: { teamId: team.id } });
      if (memberCount < team.teamSize) {
        return NextResponse.json({
          waitingForTeam: true,
          teamName: team.name,
          teamMembers: memberCount,
          teamSize: team.teamSize,
          message: `${memberCount} of ${team.teamSize} team members have joined. Waiting for the remaining members to start the quiz.`,
        }, { status: 202 });
      }
      attempt = await prisma.quizAttempt.findFirst({ where: { quizId, teamId: team.id } });
      if (!attempt) attempt = await prisma.quizAttempt.create({ data: { quizId, teamId: team.id } });
      if (attempt.isRemoved) return NextResponse.json({ error: "This participation was removed" }, { status: 403 });
    } else {
      attempt = await prisma.quizAttempt.findFirst({ where: { quizId, userId: session.userId } });
      if (!attempt) attempt = await prisma.quizAttempt.create({ data: { quizId, userId: session.userId } });
      else if (attempt.submittedAt) return NextResponse.json({ error: "Quiz already submitted" }, { status: 400 });
      else if (attempt.isRemoved) return NextResponse.json({ error: "Your participation was removed" }, { status: 403 });
    }

    const questions = quiz.questions.map((question) => ({
      id: question.id,
      text: question.text,
      options: (JSON.parse(question.options) as (string | { id?: string; text?: string })[]).map((option, index) =>
        typeof option === "string"
          ? { id: String.fromCharCode(97 + index), text: option }
          : { id: option.id || String.fromCharCode(97 + index), text: option.text || "" }
      ),
      marks: question.marks,
      negativeMarks: question.negativeMarks,
    }));
    const visitUpdate = visitId
      ? await prisma.quizVisit.updateMany({ where: { id: visitId, quizId, userId: session.userId, status: "JOINED" }, data: { status: "ENTERED", enteredAt: new Date() } })
      : { count: 0 };
    if (!visitUpdate.count) {
      await prisma.quizVisit.updateMany({
        where: { quizId, userId: session.userId, status: "JOINED" },
        data: { status: "ENTERED", enteredAt: new Date() },
      });
    }
    await prisma.quiz.updateMany({ where: { id: quizId, runtimeStatus: "READY" }, data: { runtimeStatus: "RUNNING", runtimeStartedAt: new Date() } });
    return NextResponse.json({
      attempt: { id: attempt.id, quiz: { title: quiz.title, totalQuestions: quiz.totalQuestions, duration: quiz.durationMinutes, type: quiz.quizType, presentationMode: quiz.presentationMode } },
      attemptId: attempt.id,
      quizTitle: quiz.title,
      durationMinutes: quiz.durationMinutes,
      maxViolations: quiz.maxViolations,
      startedAt: attempt.startedAt,
      violations: attempt.violations,
      questions,
    });
  } catch (error) {
    console.error("Start quiz error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}