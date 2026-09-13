import { NextResponse } from "next/server";
import { createSessionToken, getStudentSession, setStudentSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Student joins a quiz using access token
 * GET /api/quizzes/join/:accessToken
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ accessToken: string }> }
) {
  try {
    const { accessToken } = await params;

    // Find valid quiz link
    const quizLink = await prisma.quizLink.findUnique({
      where: { accessToken },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            durationMinutes: true,
            totalQuestions: true,
            quizType: true,
            teamSize: true,
            allowIndividualInTeam: true,
            isActive: true,
            runtimeStatus: true,
          },
        },
      },
    });

    if (!quizLink) {
      return NextResponse.json(
        { error: "Invalid or expired quiz link" },
        { status: 404 }
      );
    }

    // Check if link is still active
    if (!quizLink.isActive) {
      return NextResponse.json(
        { error: "This quiz link has been deactivated" },
        { status: 403 }
      );
    }

    if (!quizLink.quiz.isActive || ["STOPPED", "COMPLETED"].includes(quizLink.quiz.runtimeStatus)) {
      return NextResponse.json({ error: "This quiz is no longer accepting participants" }, { status: 403 });
    }

    // Check if link has expired
    if (quizLink.expiresAt && new Date() > quizLink.expiresAt) {
      return NextResponse.json(
        { error: "This quiz link has expired" },
        { status: 403 }
      );
    }

    // Check student limit if set
    if (
      quizLink.maxStudents &&
      quizLink.currentStudents >= quizLink.maxStudents
    ) {
      return NextResponse.json(
        { error: "Maximum number of students reached for this quiz" },
        { status: 403 }
      );
    }

    const session = await getStudentSession();

    // Check if student already attempted this quiz
    const existingAttempt = session
      ? await prisma.quizAttempt.findFirst({ where: { quizId: quizLink.quizId, userId: session.userId } })
      : null;

    return NextResponse.json({
      success: true,
      quiz: quizLink.quiz,
      canJoin: !existingAttempt,
      alreadyAttempted: !!existingAttempt,
      message: existingAttempt
        ? "You have already attempted this quiz"
        : "You can join this quiz",
    });
  } catch (error) {
    console.error("Join quiz error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Record student joining the quiz
 * POST /api/quizzes/join/:accessToken
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ accessToken: string }> }
) {
  try {
    const { accessToken } = await params;
    const body = await req.json().catch(() => ({}));

    // Find and validate link
    const quizLink = await prisma.quizLink.findUnique({
      where: { accessToken },
      include: { quiz: true },
    });

    if (quizLink && ["PAUSED", "STOPPED"].includes(quizLink.quiz.runtimeStatus)) {
      const activity = await prisma.auditLog.findFirst({ where: { targetId: quizLink.quizId, action: { in: ["QUIZ_PAUSE", "QUIZ_STOP"] } }, orderBy: { timestamp: "desc" }, include: { actor: { select: { name: true, role: true } } } });
      const state = quizLink.quiz.runtimeStatus === "PAUSED" ? "paused" : "stopped";
      const actor = activity?.actor ? `${activity.actor.name} (${activity.actor.role.toLowerCase()})` : "an administrator or controller";
      return NextResponse.json({ error: `Quiz is ${state} by ${actor}. Please wait for resume.`, status: quizLink.quiz.runtimeStatus }, { status: 409 });
    }

    if (!quizLink || !quizLink.isActive || !quizLink.quiz.isActive || ["STOPPED", "COMPLETED"].includes(quizLink.quiz.runtimeStatus) || (quizLink.expiresAt && new Date() > quizLink.expiresAt)) {
      return NextResponse.json(
        { error: "Invalid or expired quiz link" },
        { status: 403 }
      );
    }

    if (quizLink.quiz.quizType === "TEAM" && body.mode !== "individual" && body.teamName?.trim()) {
      const team = await prisma.team.findFirst({ where: { quizId: quizLink.quizId, name: body.teamName.trim(), isRemoved: false } });
      if (team) {
        const memberCount = await prisma.teamMember.count({ where: { teamId: team.id } });
        const teamSize = quizLink.quiz.teamSize || team.teamSize;
        if (memberCount >= teamSize) {
          return NextResponse.json({ error: `This team is full at ${teamSize} members. Please create another team.` }, { status: 409 });
        }
      }
    }

    let session = await getStudentSession();

    if (!session) {
      const { name, email } = body;
      if (!name?.trim()) return NextResponse.json({ error: "Student name is required" }, { status: 400 });
      const guestEmail = email?.trim() || `guest-${crypto.randomUUID()}@quiz.local`;
      let user = await prisma.user.findUnique({ where: { email: guestEmail } });
      if (user && user.role !== "STUDENT") return NextResponse.json({ error: "This email belongs to a staff account" }, { status: 403 });
      if (!user) user = await prisma.user.create({ data: { email: guestEmail, name: name.trim(), role: "STUDENT" } });
      const token = await createSessionToken({ userId: user.id, email: user.email, name: user.name, role: "STUDENT", department: user.department });
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);
      await prisma.activeSession.create({ data: { userId: user.id, role: "STUDENT", sessionToken: token, expiresAt, ipAddress: req.headers.get("x-forwarded-for") || "unknown", userAgent: req.headers.get("user-agent") || "unknown" } });
      session = { userId: user.id, email: user.email, name: user.name, role: "STUDENT", department: user.department };
      await setStudentSessionCookie(token);
    }

    const existingAttempt = await prisma.quizAttempt.findFirst({ where: { quizId: quizLink.quizId, userId: session.userId } });
    if (existingAttempt) return NextResponse.json({ error: "You have already joined this quiz" }, { status: 409 });

    const existingVisit = await prisma.quizVisit.findFirst({ where: { quizId: quizLink.quizId, userId: session.userId }, orderBy: { joinedAt: "asc" } });
    const visit = existingVisit || await prisma.quizVisit.create({ data: { quizId: quizLink.quizId, userId: session.userId, name: session.name, email: session.email } });

    // Check limits
    if (!existingVisit && quizLink.maxStudents && quizLink.currentStudents >= quizLink.maxStudents) {
      return NextResponse.json(
        { error: "Quiz is full" },
        { status: 403 }
      );
    }

    // Increment student count
    if (!existingVisit) {
      await prisma.quizLink.update({ where: { id: quizLink.id }, data: { currentStudents: { increment: 1 } } });
    }

    // Redirect to quiz entry page
    return NextResponse.json({
      success: true,
      redirectUrl: `/student/quiz/${quizLink.quizId}/enter?joinedVia=${accessToken}&visitId=${visit.id}&mode=${body.mode === "individual" ? "individual" : "team"}${body.teamName ? `&teamName=${encodeURIComponent(body.teamName)}` : ""}`,
    });
  } catch (error) {
    console.error("Join quiz error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
