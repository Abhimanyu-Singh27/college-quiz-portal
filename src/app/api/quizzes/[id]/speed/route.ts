import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;
    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get("attemptId");

    if (!attemptId) {
      return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });
    }

    // Get current attempt
    const currentAttempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        user: { select: { id: true, name: true, avatarId: true } },
        team: { select: { id: true, name: true, members: { select: { user: { select: { name: true, avatarId: true } } } } } },
        answers: { select: { timeSeconds: true } },
      },
    });

    if (!currentAttempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Calculate current participant's average time
    const currentAverageTime =
      currentAttempt.answers.length > 0
        ? Math.round(
            currentAttempt.answers.reduce((sum, a) => sum + (a.timeSeconds || 0), 0) /
              currentAttempt.answers.length
          )
        : 0;

    // Get all other participants for this quiz
    const otherAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: quizId,
        id: { not: attemptId },
      },
      include: {
        user: { select: { id: true, name: true, avatarId: true } },
        team: { select: { id: true, name: true } },
        answers: { select: { timeSeconds: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Top 10 recent attempts for comparison
    });

    // Calculate speed metrics for each participant
    const speedComparison = otherAttempts.map((attempt) => {
      const avgTime =
        attempt.answers.length > 0
          ? Math.round(
              attempt.answers.reduce((sum, a) => sum + (a.timeSeconds || 0), 0) /
                attempt.answers.length
            )
          : 0;

      return {
        participantName: attempt.user?.name || attempt.team?.name || "Unknown",
        participantType: attempt.user ? "individual" : "team",
        averageTimePerQuestion: avgTime,
        totalQuestionsAnswered: attempt.answers.length,
        isYou: attempt.id === attemptId,
        speedRanking: 0, // Will be calculated after sorting
      };
    });

    // Sort by average time (fastest first) and assign rankings
    speedComparison.sort((a, b) => a.averageTimePerQuestion - b.averageTimePerQuestion);
    speedComparison.forEach((participant, index) => {
      participant.speedRanking = index + 1;
    });

    // Find current participant's ranking
    const yourRanking = speedComparison.find((p) => p.isYou)?.speedRanking || 0;
    const isFastest = speedComparison[0]?.isYou || false;
    const averageSpeedInComparison =
      speedComparison.length > 0
        ? Math.round(speedComparison.reduce((sum, p) => sum + p.averageTimePerQuestion, 0) / speedComparison.length)
        : 0;

    // Speed comparison message
    let speedMessage = "";
    if (currentAverageTime < averageSpeedInComparison) {
      speedMessage = `You're faster than average! 🚀`;
    } else if (currentAverageTime > averageSpeedInComparison * 1.5) {
      speedMessage = `Take your time, accuracy is key! 📝`;
    } else {
      speedMessage = `Steady pace! Keep it up! 💪`;
    }

    return NextResponse.json({
      success: true,
      yourAverageTime: currentAverageTime,
      yourRanking: yourRanking,
      totalParticipants: speedComparison.length,
      isFastest,
      averageSpeedInComparison,
      speedMessage,
      speedComparison: speedComparison.slice(0, 5), // Return top 5 for display
      allParticipants: speedComparison,
    });
  } catch (error) {
    console.error("Speed comparison error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
