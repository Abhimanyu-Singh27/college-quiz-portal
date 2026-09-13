import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Get/Set session configuration
 * GET /api/admin/session-config - Get current config
 * POST /api/admin/session-config - Update config
 */
export async function GET(req: Request) {
  try {
    const session = await requireAdmin();

    let config = await prisma.sessionConfig.findFirst();

    // Create default if doesn't exist
    if (!config) {
      config = await prisma.sessionConfig.create({
        data: {
          maxConcurrentAdmins: 1,
          maxConcurrentControllers: 2,
          maxConcurrentStudents: 999,
        },
      });
    }

    // Get active sessions by role
    const activeSessions = await prisma.activeSession.findMany({
      where: {
        logoutAt: null,
        OR: [{ role: { not: "STUDENT" } }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            quiznexaId: true,
            role: true,
            isControllerVerified: true,
            controllerRemoved: true,
          },
        },
      },
      orderBy: { loginAt: "desc" },
    });

    // Count by role
    const adminCount = activeSessions.filter((s) => s.role === "ADMIN").length;
    const controllerCount = new Set(
      activeSessions.filter((s) => s.role === "CONTROLLER" && s.user.role === "CONTROLLER" && s.user.isControllerVerified && !s.user.controllerRemoved).map((s) => s.userId)
    ).size;
    const studentCount = activeSessions.filter(
      (s) => s.role === "STUDENT"
    ).length;

    return NextResponse.json({
      success: true,
      config,
      activeSessions: {
        total: activeSessions.length,
        byRole: {
          admin: adminCount,
          controller: controllerCount,
          student: studentCount,
        },
        sessions: activeSessions,
      },
      limits: {
        maxAdmins: config.maxConcurrentAdmins,
        maxControllers: config.maxConcurrentControllers,
        maxStudents: config.maxConcurrentStudents,
      },
    });
  } catch (error) {
    console.error("Get session config error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { maxConcurrentAdmins, maxConcurrentControllers, maxConcurrentStudents } =
      body;

    // Validate inputs
    if (
      (maxConcurrentAdmins !== undefined && maxConcurrentAdmins < 1) ||
      (maxConcurrentControllers !== undefined && (maxConcurrentControllers < 1 || maxConcurrentControllers > 4)) ||
      (maxConcurrentStudents !== undefined && maxConcurrentStudents < 1)
    ) {
      return NextResponse.json(
        { error: "Invalid configuration values" },
        { status: 400 }
      );
    }

    let config = await prisma.sessionConfig.findFirst();

    if (!config) {
      config = await prisma.sessionConfig.create({
        data: {
          maxConcurrentAdmins: maxConcurrentAdmins ?? 1,
          maxConcurrentControllers: maxConcurrentControllers ?? 2,
          maxConcurrentStudents: maxConcurrentStudents ?? 999,
        },
      });
    } else {
      config = await prisma.sessionConfig.update({
        where: { id: config.id },
        data: {
          ...(maxConcurrentAdmins !== undefined && {
            maxConcurrentAdmins,
          }),
          ...(maxConcurrentControllers !== undefined && {
            maxConcurrentControllers,
            controllersConfigured: true,
          }),
          ...(maxConcurrentStudents !== undefined && {
            maxConcurrentStudents,
          }),
        },
      });
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "SESSION_CONFIG_UPDATED",
        details: `Updated session limits - Admins: ${config.maxConcurrentAdmins}, Controllers: ${config.maxConcurrentControllers}, Students: ${config.maxConcurrentStudents}`,
      },
    });

    return NextResponse.json({
      success: true,
      config,
      message: "Session configuration updated successfully",
    });
  } catch (error) {
    console.error("Update session config error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Force logout a session (admin only)
 * DELETE /api/admin/session-config?sessionId=XXX
 */
export async function DELETE(req: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Find and close session
    const activeSession = await prisma.activeSession.update({
      where: { id: sessionId },
      data: { logoutAt: new Date() },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "SESSION_FORCE_LOGOUT",
        details: `Force logged out user: ${activeSession.userId} (${activeSession.role})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Session ended for user`,
    });
  } catch (error) {
    console.error("Force logout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
