import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Check if a user can login based on concurrent session limits
 * GET /api/auth/check-availability?role=ADMIN
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedRole = searchParams.get("role");
    const role = requestedRole as "ADMIN" | "CONTROLLER" | "STUDENT";

    if (!requestedRole || !["ADMIN", "CONTROLLER", "STUDENT", "STAFF"].includes(requestedRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Get session configuration
    const config = await prisma.sessionConfig.findFirst();
    const defaultConfig = {
      maxConcurrentAdmins: 1,
      maxConcurrentControllers: 2,
      controllersConfigured: false,
      maxConcurrentStudents: 999,
    };

    const sessionConfig = config || defaultConfig;

    // The landing page uses one snapshot so it can show only the next available role.
    if (requestedRole === "STAFF") {
      const activeSessions = await prisma.activeSession.findMany({
        where: { logoutAt: null, OR: [{ role: { not: "STUDENT" } }, { expiresAt: { gt: new Date() } }] },
        include: { user: { select: { id: true, role: true, quiznexaId: true, isControllerVerified: true, controllerRemoved: true } } },
      });
      const adminCount = activeSessions.filter((session) => session.role === "ADMIN").length;
      const controllerCount = new Set(
        activeSessions.filter((session) => session.role === "CONTROLLER" && session.user.role === "CONTROLLER" && session.user.isControllerVerified && !session.user.controllerRemoved).map((session) => session.userId)
      ).size;
      const adminLimit = sessionConfig.maxConcurrentAdmins;
      const controllerLimit = sessionConfig.maxConcurrentControllers;
      const controllersConfigured = sessionConfig.controllersConfigured;
      const nextRole = "ADMIN";
      const adminConfigured = await prisma.user.count({ where: { role: "ADMIN" } }) > 0;
      const assignedControllers = await prisma.user.count({ where: { role: "CONTROLLER" } });
      const activeAdmin = await prisma.activeSession.findFirst({ where: { role: "ADMIN", logoutAt: null }, select: { user: { select: { name: true } } } });
      return NextResponse.json({
        success: true,
        admin: { currentCount: adminCount, maxLimit: adminLimit, isAvailable: true },
        controller: { currentCount: controllerCount, maxLimit: controllerLimit, isAvailable: controllerCount < controllerLimit },
        nextRole,
        allSlotsFull: !nextRole,
        adminConfigured,
        controllersConfigured,
        activeAdminName: activeAdmin?.user.name || null,
        assignedControllers,
      });
    }

    // Count active sessions for the requested role.
    const activeSessions = await prisma.activeSession.findMany({
      where: {
        role,
        logoutAt: null,
        OR: [{ role: { not: "STUDENT" } }, { expiresAt: { gt: new Date() } }],
      },
    });

    const maxLimit =
      role === "ADMIN"
        ? sessionConfig.maxConcurrentAdmins
        : role === "CONTROLLER"
          ? sessionConfig.maxConcurrentControllers
          : sessionConfig.maxConcurrentStudents;

    const currentCount = role === "CONTROLLER"
      ? new Set(activeSessions.map((session) => session.userId)).size
      : activeSessions.length;
    const isAvailable = currentCount < maxLimit;

    return NextResponse.json({
      success: true,
      role,
      currentCount,
      maxLimit,
      isAvailable,
      message: isAvailable
        ? "Login available"
        : `Maximum ${maxLimit} ${role.toLowerCase()} session(s) already active`,
    });
  } catch (error) {
    console.error("Check availability error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
