import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasControllerFeature } from "@/lib/controller-permissions";
import { requestControllerApproval } from "@/lib/controller-approval";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quizzes = await prisma.quiz.findMany({
    include: {
      createdBy: { select: { name: true, email: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ quizzes });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "CONTROLLER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await hasControllerFeature(session, "CREATE_QUIZ"))) {
    return NextResponse.json({ error: "Quiz creation is not granted by an admin" }, { status: 403 });
  }

  let body: { title?: string; description?: string; durationMinutes?: number | string; maxViolations?: number | string; quizType?: string; teamSize?: number | string; allowIndividualInTeam?: boolean; presentationMode?: string; resultsDisplayInterval?: number | string; questions?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { title, description, durationMinutes, maxViolations, quizType, teamSize, allowIndividualInTeam, presentationMode, resultsDisplayInterval, questions } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Quiz title is required" }, { status: 400 });
  if (!Array.isArray(questions) || questions.length === 0) return NextResponse.json({ error: "Add at least one question" }, { status: 400 });
  if (questions.some((question) => {
    const item = question as { content?: string; options?: { text?: string }[]; correctOption?: string };
    return !item.content?.trim() || !Array.isArray(item.options) || item.options.some((option) => !option.text?.trim()) || !item.correctOption;
  })) {
    return NextResponse.json({ error: "Complete each question, all four options, and the correct answer" }, { status: 400 });
  }

  const approval = await requestControllerApproval(session, "CREATE_QUIZ", body as Record<string, unknown>);
  if (!approval.approved) return NextResponse.json({ approvalRequired: true, requestId: approval.requestId, message: "Quiz creation was sent to the administrator for approval." }, { status: 202 });

  const quiz = await prisma.quiz.create({
    data: {
      title: title.trim(),
      description,
      department: session.department || "Academic",
      durationMinutes: Number(durationMinutes) || 30,
      maxViolations: Number(maxViolations) || 3,
      quizType: quizType === "TEAM" ? "TEAM" : "INDIVIDUAL",
      allowIndividualInTeam: quizType === "TEAM" && Boolean(allowIndividualInTeam),
      presentationMode: presentationMode === "FUN" ? "FUN" : "NORMAL",
      resultsDisplayInterval: Math.max(0, Number(resultsDisplayInterval) || 0),
      teamSize: quizType === "TEAM" ? Math.max(2, Number(teamSize) || 2) : null,
      totalQuestions: questions.length,
      createdById: session.userId,
      questions: {
        create: questions.map((q: any) => ({
          text: q.content,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctOption,
          marks: Number(q.marks) || 1,
          negativeMarks: Number(q.negativeMarks) || 0,
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "QUIZ_CREATED",
      details: `Created quiz: ${quiz.title}`,
    },
  });

  return NextResponse.json({ success: true, quizId: quiz.id });
}
