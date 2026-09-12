import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stopQuizWhenExpired } from "@/lib/quiz-runtime";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;
    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get("attemptId");

    if (!attemptId) {
      return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });
    }

    // Fetch the quiz attempt with answers
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                correctAnswer: true,
                text: true,
              },
            },
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
            totalQuestions: true,
            resultsDisplayInterval: true,
            runtimeStatus: true,
            createdAt: true,
            durationMinutes: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    if (await stopQuizWhenExpired(attempt.quiz)) attempt.quiz.runtimeStatus = "STOPPED";

    // Verify user owns this attempt
    if (attempt.userId !== session.userId && attempt.teamId) {
      // For teams, verify user is part of the team
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: attempt.teamId,
          userId: session.userId,
        },
      });
      
      if (!teamMember) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else if (attempt.userId && attempt.userId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Calculate score
    let correctCount = 0;
    let totalTimeSeconds = 0;

    attempt.answers.forEach((answer) => {
      if (answer.isCorrect) correctCount++;
      if (answer.timeSeconds) {
        totalTimeSeconds += answer.timeSeconds;
      }
    });

    const score = Math.round((correctCount / attempt.quiz.totalQuestions) * 100);
    const questionsAnswered = attempt.answers.length;
    const wrongAnswers = questionsAnswered - correctCount;
    const averageTimePerQuestion =
      questionsAnswered > 0 ? Math.round(totalTimeSeconds / questionsAnswered) : 0;

    // Check if results should be displayed
    const resultsDisplayInterval =
      attempt.quiz.resultsDisplayInterval || attempt.quiz.totalQuestions;
    const shouldDisplayResults =
      questionsAnswered % resultsDisplayInterval === 0 || 
      questionsAnswered === attempt.quiz.totalQuestions;

    // For team attempts, get team leaderboard
    let teamLeaderboard = null;
    if (attempt.teamId) {
      const teamAttempts = await prisma.quizAttempt.findMany({
        where: {
          quizId: attempt.quizId,
          teamId: attempt.teamId,
        },
        include: {
          answers: {
            select: { answer: true },
          },
          team: {
            select: {
              id: true,
              name: true,
              _count: { select: { members: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });

      if (teamAttempts.length > 0) {
        const ta = teamAttempts[0];
        let teamCorrect = 0;
        ta.answers.forEach((answer) => {
          // This is simplified - proper version needs question data
          if (answer.answer) teamCorrect++;
        });

        teamLeaderboard = {
          teamName: ta.team?.name,
          teamSize: ta.team?._count.members,
          currentScore: Math.round((teamCorrect / attempt.quiz.totalQuestions) * 100),
          questionsAnswered: ta.answers.length,
        };
      }
    }

    return NextResponse.json({
      success: true,
      currentScore: score,
      correctAnswers: correctCount,
      wrongAnswers,
      questionsAnswered,
      totalQuestions: attempt.quiz.totalQuestions,
      averageTimePerQuestion,
      totalTimeSeconds,
      shouldDisplayResults,
      resultsDisplayInterval,
      teamLeaderboard,
      quizTitle: attempt.quiz.title,
      runtimeStatus: attempt.quiz.runtimeStatus,
    });
  } catch (error) {
    console.error("Quiz progress error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
