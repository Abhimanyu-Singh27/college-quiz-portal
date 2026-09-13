import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasControllerFeature } from "@/lib/controller-permissions";
import { stopQuizWhenExpired } from "@/lib/quiz-runtime";

function parseQuestionOptions(value: string): string[] {
  try {
    const options = JSON.parse(value);
    return Array.isArray(options) ? options.filter((option): option is string => typeof option === "string") : [];
  } catch {
    return [];
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "CONTROLLER")) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  try {
    const { id: quizId } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true, title: true, runtimeStatus: true, updatedAt: true, durationMinutes: true,
        createdAt: true,
        totalQuestions: true, quizType: true, presentationMode: true,
        createdById: true,
        visits: { select: { id: true, userId: true, name: true, email: true, status: true, joinedAt: true, leftAt: true }, orderBy: { joinedAt: "asc" } },
        attempts: {
          where: { isRemoved: false },
          orderBy: [{ score: "desc" }, { totalTimeSeconds: "asc" }],
          take: 5000,
          select: {
            id: true, score: true, questionsAnswered: true, totalTimeSeconds: true,
            averageTimePerQuestion: true, submittedAt: true, startedAt: true,
            isDisqualified: true, user: { select: { id: true, name: true, email: true } },
            team: { select: { name: true, members: { select: { user: { select: { id: true, name: true, email: true } } } } } },
            _count: { select: { answers: true } },
          },
        },
        questions: { select: { id: true, text: true, options: true, correctAnswer: true } },
      },
    });

    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (await stopQuizWhenExpired(quiz)) quiz.runtimeStatus = "STOPPED";
    if (!(await hasControllerFeature(session, "LIVE_ANALYSIS", quiz.id))) {
      return NextResponse.json({ error: "Live analysis is not granted by an admin" }, { status: 403 });
    }

    const answerGroups = await prisma.quizAnswer.groupBy({
      by: ["questionId"],
      where: { attempt: { quizId: quiz.id, isRemoved: false } },
      _count: { _all: true },
    });
    const correctGroups = await prisma.quizAnswer.groupBy({
      by: ["questionId"],
      where: { attempt: { quizId: quiz.id, isRemoved: false }, isCorrect: true },
      _count: { _all: true },
    });
    const correctAnswersByAttempt = await prisma.quizAnswer.groupBy({
      by: ["attemptId"],
      where: { attempt: { quizId: quiz.id, isRemoved: false }, isCorrect: true },
      _count: { _all: true },
    });
    const correctByQuestion = new Map(correctGroups.map((item) => [item.questionId, item._count._all]));
    const correctByAttempt = new Map(correctAnswersByAttempt.map((item) => [item.attemptId, item._count._all]));
    const answersByQuestion = new Map(answerGroups.map((item) => [item.questionId, item._count._all]));
    const currentVisitUserIds = new Set(quiz.visits.map((visit) => visit.userId).filter((userId): userId is string => Boolean(userId)));
    const attemptHasCurrentVisit = (attempt: (typeof quiz.attempts)[number] | undefined) => Boolean(attempt && (attempt.user ? currentVisitUserIds.has(attempt.user.id) : attempt.team?.members.some((member) => currentVisitUserIds.has(member.user.id))));
    const allAttemptedParticipants = quiz.attempts.filter((attempt) => attempt.questionsAnswered > 0).map((attempt, index) => ({
      rank: index + 1,
      id: attempt.id,
      name: attempt.team?.name || attempt.user?.name || "Unknown",
      email: attempt.user?.email || null,
      score: attempt.score,
      answered: attempt._count.answers,
      totalTimeSeconds: attempt.totalTimeSeconds,
      averageTimePerQuestion: attempt.averageTimePerQuestion,
      submitted: Boolean(attempt.submittedAt),
      disqualified: attempt.isDisqualified,
      startedAt: attempt.startedAt,
      teamMembers: attempt.team?.members || [],
    }));
    const rankedParticipants = allAttemptedParticipants.map((participant, index) => ({ ...participant, rank: index + 1 }));
    const submitted = rankedParticipants.filter((participant) => participant.submitted);
    const rankByAttemptId = new Map(rankedParticipants.map((participant) => [participant.id, participant.rank]));
    const attemptForVisit = (visit: (typeof quiz.visits)[number]) => quiz.attempts.find((item) => item.user?.id === visit.userId || item.team?.members.some((member) => member.user.id === visit.userId));
    const activeAttemptIds = new Set(quiz.visits.filter((visit) => visit.status === "ENTERED").map((visit) => attemptForVisit(visit)?.id).filter((id): id is string => Boolean(id)));
    const leftEarlyAttemptIds = new Set(quiz.visits.filter((visit) => visit.status === "LEFT_EARLY").map((visit) => attemptForVisit(visit)?.id).filter((id): id is string => Boolean(id)));
    const participants = rankedParticipants.filter((participant) => !participant.submitted && activeAttemptIds.has(participant.id) && !leftEarlyAttemptIds.has(participant.id));
    const notJoined = quiz.visits.filter((visit) => (attemptForVisit(visit)?.questionsAnswered || 0) === 0).map((visit) => ({
      id: visit.id,
      name: visit.name,
      email: visit.email,
      status: visit.status,
      joinedAt: visit.joinedAt,
    }));
    const earlyLeaves = quiz.visits.filter((visit, index, visits) => visit.status === "LEFT_EARLY" && (attemptForVisit(visit)?.questionsAnswered || 0) > 0 && !attemptForVisit(visit)?.submittedAt && (!visit.userId || visits.filter((candidate) => candidate.status === "LEFT_EARLY" && candidate.userId === visit.userId).findIndex((candidate) => candidate.id === visit.id) === 0)).map((visit) => {
      const attempt = attemptForVisit(visit);
      const answered = attempt?.questionsAnswered || 0;
      return {
        id: visit.id,
        name: visit.name,
        email: visit.email,
        answered,
        correctAnswers: attempt ? correctByAttempt.get(attempt.id) || 0 : 0,
        progress: quiz.totalQuestions ? Math.round((answered / quiz.totalQuestions) * 100) : 0,
        score: attempt?.score || 0,
        rank: attempt ? rankByAttemptId.get(attempt.id) || null : null,
        leftAt: visit.leftAt || visit.joinedAt,
      };
    }).concat(quiz.attempts.filter((attempt) => attempt.questionsAnswered > 0 && !attempt.submittedAt && !attemptHasCurrentVisit(attempt)).map((attempt) => ({
      id: attempt.id,
      name: attempt.team?.name || attempt.user?.name || "Unknown",
      email: attempt.user?.email || null,
      answered: attempt.questionsAnswered,
      correctAnswers: correctByAttempt.get(attempt.id) || 0,
      progress: quiz.totalQuestions ? Math.round((attempt.questionsAnswered / quiz.totalQuestions) * 100) : 0,
      score: attempt.score,
      rank: rankByAttemptId.get(attempt.id) || null,
      leftAt: attempt.startedAt,
    })));
    const submittedParticipants = quiz.visits.map((visit) => {
      const attempt = attemptForVisit(visit);
      if (!attempt?.submittedAt) return null;
      const answered = attempt.questionsAnswered;
      return {
        id: visit.id,
        name: visit.name,
        email: visit.email,
        answered,
        correctAnswers: correctByAttempt.get(attempt.id) || 0,
        progress: quiz.totalQuestions ? Math.round((answered / quiz.totalQuestions) * 100) : 0,
        score: attempt.score,
        rank: rankByAttemptId.get(attempt.id) || null,
        submittedAt: attempt.submittedAt,
      };
    }).filter((participant): participant is NonNullable<typeof participant> => Boolean(participant));
    const participantRecords = quiz.visits.map((visit) => {
      const attempt = attemptForVisit(visit);
      const answered = attempt?.questionsAnswered || 0;
      return {
        id: visit.id,
        rank: attempt ? rankByAttemptId.get(attempt.id) || null : null,
        name: visit.name,
        email: visit.email,
        score: attempt?.score || 0,
        answered,
        correctAnswers: attempt ? correctByAttempt.get(attempt.id) || 0 : 0,
        totalTimeSeconds: attempt?.totalTimeSeconds || 0,
        averageTimePerQuestion: attempt?.averageTimePerQuestion || 0,
        submitted: Boolean(attempt?.submittedAt),
        disqualified: Boolean(attempt?.isDisqualified),
        startedAt: attempt?.startedAt || visit.joinedAt,
        state: attempt?.submittedAt ? "Submitted" : visit.status === "ENTERED" && answered > 0 ? "In progress" : answered === 0 ? "Not joined" : "Leaved",
        teamMembers: attempt?.team?.members || [],
      };
    }).concat(quiz.attempts.filter((attempt) => !attemptHasCurrentVisit(attempt) && attempt.questionsAnswered > 0).map((attempt) => ({
      id: attempt.id,
      rank: rankByAttemptId.get(attempt.id) || null,
      name: attempt.team?.name || attempt.user?.name || "Unknown",
      email: attempt.user?.email || null,
      score: attempt.score,
      answered: attempt.questionsAnswered,
      correctAnswers: correctByAttempt.get(attempt.id) || 0,
      totalTimeSeconds: attempt.totalTimeSeconds,
      averageTimePerQuestion: attempt.averageTimePerQuestion,
      submitted: Boolean(attempt.submittedAt),
      disqualified: attempt.isDisqualified,
      startedAt: attempt.startedAt,
      state: attempt.submittedAt ? "Submitted" : "Leaved",
      teamMembers: attempt.team?.members || [],
    })));
    const questionAnalytics = quiz.questions.map((question, index) => ({
      number: index + 1,
      id: question.id,
      text: question.text,
      options: parseQuestionOptions(question.options),
      correctAnswer: question.correctAnswer,
      answers: answersByQuestion.get(question.id) || 0,
      correct: correctByQuestion.get(question.id) || 0,
      accuracy: answersByQuestion.get(question.id) ? Math.round(((correctByQuestion.get(question.id) || 0) / (answersByQuestion.get(question.id) || 1)) * 100) : 0,
    }));

    return NextResponse.json({
      quiz: { id: quiz.id, title: quiz.title, runtimeStatus: quiz.runtimeStatus, durationMinutes: quiz.durationMinutes, totalQuestions: quiz.totalQuestions, quizType: quiz.quizType, presentationMode: quiz.presentationMode },
      summary: {
        totalParticipants: participantRecords.length,
        activeParticipants: participants.length,
        submittedParticipants: submitted.length,
        averageScore: submitted.length ? Math.round(submitted.reduce((sum, participant) => sum + participant.score, 0) / submitted.length) : 0,
        completionRate: rankedParticipants.length ? Math.round((submitted.length / rankedParticipants.length) * 100) : 0,
      },
      participants: participantRecords,
      notJoined,
      earlyLeaves,
      submittedParticipants,
      questionAnalytics,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Quiz monitor error:", error);
    return NextResponse.json({ error: "Unable to load live analysis" }, { status: 500 });
  }
}