import { NextResponse } from "next/server";
import { requireAdminOrController } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { hasControllerFeature } from "@/lib/controller-permissions";
import QRCode from "qrcode";
import { stopQuizWhenExpired } from "@/lib/quiz-runtime";

/**
 * Generate access link and QR code for a quiz
 * POST /api/quizzes/:id/generate-link
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminOrController();
    const { id: quizId } = await params;

    const body = await req.json();
    const { maxStudents } = body;

    // Verify quiz exists and user has access
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    if (await stopQuizWhenExpired(quiz)) quiz.runtimeStatus = "STOPPED";
    if (quiz.runtimeStatus === "STOPPED" || quiz.runtimeStatus === "COMPLETED") {
      await prisma.quizLink.deleteMany({ where: { quizId } });
      return NextResponse.json({ success: true, links: [] });
    }

    if (!(await hasControllerFeature(session, "MANAGE_LINKS", quizId))) {
      return NextResponse.json({ error: "Link management is not granted by an admin" }, { status: 403 });
    }

    // Generate unique access token
    const accessToken = randomBytes(32).toString("hex");
    const origin = process.env.NEXT_PUBLIC_APP_URL || getRequestOrigin(req);
    const shareLink = `${origin}/student/join/${accessToken}`;

    // Use the unique quiz join link as the payload for a real scannable QR image.
    const qrCodeData = await QRCode.toDataURL(shareLink, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 320,
      margin: 2,
      color: { dark: "#172a2d", light: "#ffffff" },
    });

    // Create quiz link
    const quizLink = await prisma.quizLink.create({
      data: {
        quizId,
        accessToken,
        shareLink,
        qrCodeData,
        maxStudents: maxStudents || null,
        createdBy: session.userId,
        isActive: true,
        expiresAt: new Date(Date.now() + quiz.durationMinutes * 60 * 1000),
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "QUIZ_LINK_GENERATED",
        details: `Generated access link for quiz: ${quiz.title} (max students: ${maxStudents || "unlimited"})`,
      },
    });

    return NextResponse.json({
      success: true,
      quizLink: {
        id: quizLink.id,
        accessToken: quizLink.accessToken,
        shareLink: quizLink.shareLink,
        qrCodeData: quizLink.qrCodeData,
        maxStudents: quizLink.maxStudents,
        isActive: quizLink.isActive,
        expiresAt: quizLink.expiresAt,
      },
    });
  } catch (error) {
    console.error("Generate quiz link error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Get existing links for a quiz
 * GET /api/quizzes/:id/links
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminOrController();
    const { id: quizId } = await params;

    // Verify quiz exists and user has access
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    if (await stopQuizWhenExpired(quiz)) quiz.runtimeStatus = "STOPPED";
    if (quiz.runtimeStatus === "STOPPED" || quiz.runtimeStatus === "COMPLETED") {
      await prisma.quizLink.deleteMany({ where: { quizId } });
      return NextResponse.json({ success: true, links: [] });
    }

    if (!(await hasControllerFeature(session, "MANAGE_LINKS", quizId))) {
      return NextResponse.json({ error: "Link management is not granted by an admin" }, { status: 403 });
    }

    // Get all active links
    const links = await prisma.quizLink.findMany({
      where: {
        quizId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      links,
    });
  } catch (error) {
    console.error("Get quiz links error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminOrController();
    const { id: quizId } = await params;
    const { linkId } = await req.json();

    if (!linkId) return NextResponse.json({ error: "Link ID is required" }, { status: 400 });
    const link = await prisma.quizLink.findFirst({ where: { id: linkId, quizId, isActive: true } });
    if (!link) return NextResponse.json({ error: "Active link not found" }, { status: 404 });
    if (!(await hasControllerFeature(session, "MANAGE_LINKS", quizId))) {
      return NextResponse.json({ error: "Link management is not granted by an admin" }, { status: 403 });
    }

    await prisma.quizLink.update({ where: { id: linkId }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quiz link error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function getRequestOrigin(req: Request): string {
  const forwardedProtocol = req.headers.get("x-forwarded-proto") || "http";
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  return forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : "http://localhost:3000";
}
