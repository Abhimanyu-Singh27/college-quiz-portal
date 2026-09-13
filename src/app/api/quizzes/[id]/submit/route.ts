import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stopQuizWhenExpired } from "@/lib/quiz-runtime";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await params;
    const { attemptId, questionId, answer, timeSeconds } = body;

    if (!attemptId || !questionId || !answer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the attempt belongs to the user
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        team: {
          include: { members: { select: { userId: true } } },
        },
        quiz: { select: { id: true, totalQuestions: true, runtimeStatus: true, runtimeStartedAt: true, createdAt: true, durationMinutes: true } },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    if (await stopQuizWhenExpired(attempt.quiz)) attempt.quiz.runtimeStatus = "STOPPED";

    if (["PAUSED", "STOPPED", "COMPLETED"].includes(attempt.quiz.runtimeStatus)) {
      return NextResponse.json({ error: `This quiz is ${attempt.quiz.runtimeStatus.toLowerCase()}` }, { status: 409 });
    }

    // Verify user is part of the attempt
    if (attempt.userId && attempt.userId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (attempt.teamId) {
      const teamMember = attempt.team?.members.find((m) => m.userId === session.userId);
      if (!teamMember) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Get the question to verify it exists in the quiz
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });

    if (!question || question.quizId !== attempt.quizId) {
      return NextResponse.json({ error: "Invalid question" }, { status: 400 });
    }

    const options = JSON.parse(question.options) as (string | { id?: string; text?: string })[];
    const selectedOption = options.find((option, index) => {
      const optionId = typeof option === "string" ? String.fromCharCode(97 + index) : option.id || String.fromCharCode(97 + index);
      const optionText = typeof option === "string" ? option : option.text || "";
      return answer === optionId || answer === optionText;
    });
    const correctOption = options.find((option, index) => {
      const optionId = typeof option === "string" ? String.fromCharCode(97 + index) : option.id || String.fromCharCode(97 + index);
      const optionText = typeof option === "string" ? option : option.text || "";
      return question.correctAnswer === optionId || question.correctAnswer === optionText;
    });
    const isCorrect = Boolean(selectedOption && correctOption && options.indexOf(selectedOption) === options.indexOf(correctOption));

    // Create the answer record
    const quizAnswer = await prisma.quizAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { answer, timeSeconds: timeSeconds || 0, isCorrect },
      create: { attemptId, questionId, answer, timeSeconds: timeSeconds || 0, isCorrect },
    });

    const [answerStats, correctCount] = await Promise.all([
      prisma.quizAnswer.aggregate({ where: { attemptId }, _count: { _all: true }, _sum: { timeSeconds: true } }),
      prisma.quizAnswer.count({ where: { attemptId, isCorrect: true } }),
    ]);
    const questionsAnswered = answerStats._count._all;
    const totalTimeSeconds = answerStats._sum.timeSeconds || 0;
    const averageTimePerQuestion = questionsAnswered > 0
      ? Math.round(totalTimeSeconds / questionsAnswered)
      : 0;
    const score = Math.round((correctCount / attempt.quiz.totalQuestions) * 100);

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        totalTimeSeconds,
        averageTimePerQuestion,
        questionsAnswered,
        score,
      },
    });

    if (questionsAnswered >= attempt.quiz.totalQuestions) {
      await prisma.quizAttempt.update({ where: { id: attemptId }, data: { submittedAt: new Date() } });
    }

    return NextResponse.json({
      success: true,
      answer: quizAnswer,
      isCorrect: quizAnswer.isCorrect,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
