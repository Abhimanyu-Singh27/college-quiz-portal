import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { createQuizNexaId } from "@/lib/quiznexa-id";

// Helper function to check session availability
async function checkSessionAvailability(role: "ADMIN" | "CONTROLLER" | "STUDENT") {
  // Get session configuration
  let config = await prisma.sessionConfig.findFirst();
  if (!config) {
    config = await prisma.sessionConfig.create({
      data: {
        maxConcurrentAdmins: 1,
        maxConcurrentControllers: 2,
        maxConcurrentStudents: 999,
      },
    });
  }

  // Count active sessions for this role
      const activeSessions = await prisma.activeSession.findMany({
    where: {
      role,
      logoutAt: null,
      expiresAt: { gt: new Date() },
      ...(role === "CONTROLLER" ? { user: { role: "CONTROLLER", isControllerVerified: true, controllerRemoved: false } } : {}),
    },
  });

  const maxLimit =
    role === "ADMIN"
      ? config.maxConcurrentAdmins
      : role === "CONTROLLER"
        ? config.maxConcurrentControllers
        : config.maxConcurrentStudents;

  const currentCount = role === "CONTROLLER"
    ? new Set(activeSessions.map((session) => session.userId)).size
    : activeSessions.length;
  const isAvailable = currentCount < maxLimit;

  return {
    isAvailable,
    currentCount,
    maxLimit,
    config,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { quiznexaId, name, password, role, createAccount } = body;

    if (role === "STUDENT") {
      return NextResponse.json(
        { error: "Students must join through a generated quiz link or QR code." },
        { status: 403 }
      );
    }

    if (!quiznexaId && !(role === "ADMIN" && createAccount)) {
      return NextResponse.json({ error: "QuizNexa ID is required" }, { status: 400 });
    }

    // Admin and Controller require password
    if (role === "ADMIN" || role === "CONTROLLER") {
      if (!password) {
        return NextResponse.json({ error: "Password required for this role" }, { status: 400 });
      }

      const staffWithoutIds = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "CONTROLLER"] }, quiznexaId: null }, select: { id: true, role: true } });
      for (const staff of staffWithoutIds) await prisma.user.update({ where: { id: staff.id }, data: { quiznexaId: createQuizNexaId(staff.role as "ADMIN" | "CONTROLLER") } });
      const normalizedQuizNexaId = quiznexaId?.trim().toUpperCase() || "";
      let user = normalizedQuizNexaId ? await prisma.user.findUnique({ where: { quiznexaId: normalizedQuizNexaId } }) : null;

      if (role === "ADMIN" && createAccount) {
        if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        if (!name?.trim()) return NextResponse.json({ error: "Name is required when creating an administrator" }, { status: 400 });
        const generatedId = createQuizNexaId("ADMIN");
        user = await prisma.user.create({ data: { email: `admin-${generatedId.toLowerCase()}@quiznexa.local`, quiznexaId: generatedId, name: name.trim(), password, role: "ADMIN", department: "Administration" } });
      }

      // The first administrator chooses the account details instead of using a hardcoded credential.
      if (role === "ADMIN" && !user) {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
        if (adminCount === 0) {
          if (!createAccount) {
            return NextResponse.json({ error: "No administrator exists yet. Choose Create account to set up administrator access." }, { status: 401 });
          }
          if (password.length < 6) {
            return NextResponse.json({ error: "Admin password must be at least 6 characters" }, { status: 400 });
          }
          const generatedId = createQuizNexaId("ADMIN");
          user = await prisma.user.create({
            data: { email: `admin-${generatedId.toLowerCase()}@quiznexa.local`, quiznexaId: generatedId, name: name.trim(), password, role: "ADMIN", department: "Administration" },
          });
        }
      }
      
      if (!user) {
        return NextResponse.json({ error: "Invalid QuizNexa ID or password" }, { status: 401 });
      }

      if (user.role !== role) {
        return NextResponse.json({ error: "This QuizNexa ID is registered as a different role" }, { status: 401 });
      }

      // Simple password check (in production, use bcrypt)
      if (user.password !== password) {
        return NextResponse.json({ error: "Invalid QuizNexa ID or password" }, { status: 401 });
      }

      // Check controller verification status
      if (role === "CONTROLLER" && !user.isControllerVerified) {
        if (user.controllerRemoved) {
          return NextResponse.json({
            error: "An administrator removed your Controller access. You cannot log in with this account.",
            status: "CONTROLLER_REMOVED",
          }, { status: 403 });
        }
        return NextResponse.json({
          error: "Your controller account is pending verification by an admin. Please wait for approval.",
          status: "PENDING_VERIFICATION",
        }, { status: 403 });
      }

      if (role === "CONTROLLER") {
        const existingControllerSession = await prisma.activeSession.findFirst({ where: { userId: user.id, role: "CONTROLLER", logoutAt: null }, select: { id: true } });
        if (existingControllerSession) {
          return NextResponse.json({
            error: "This Controller is already logged in. Sign out from the current session before logging in again.",
            status: "CONTROLLER_ALREADY_ACTIVE",
          }, { status: 409 });
        }
        const assignedControllers = await prisma.user.count({ where: { role: "CONTROLLER", controllerRemoved: false } });
        if (assignedControllers === 0) {
          return NextResponse.json({
            error: "The administrator has not assigned any Controller yet. Please contact the administrator.",
            status: "CONTROLLER_NOT_ASSIGNED",
          }, { status: 403 });
        }
        const config = await prisma.sessionConfig.findFirst();
        if (!config?.controllersConfigured) {
          if (config) {
            await prisma.sessionConfig.update({ where: { id: config.id }, data: { controllersConfigured: true } });
          } else {
            await prisma.sessionConfig.create({ data: { controllersConfigured: true } });
          }
        }
        const activeAdmin = await prisma.activeSession.count({ where: { role: "ADMIN", logoutAt: null, expiresAt: { gt: new Date() } } });
        if (activeAdmin === 0) {
          return NextResponse.json({
            error: "Controller sign-in opens after the administrator signs in.",
            status: "ADMIN_REQUIRED",
          }, { status: 403 });
        }
      }

      // Check session availability
      const availability = await checkSessionAvailability(role);
      if (!availability.isAvailable && role !== "ADMIN") {
        return NextResponse.json({
          error: `Maximum ${role.toLowerCase()} sessions (${availability.maxLimit}) already in use. Please try again later.`,
          status: "SESSION_LIMIT_EXCEEDED",
          currentSessions: availability.currentCount,
          maxSessions: availability.maxLimit,
        }, { status: 429 });
      }

      const token = await createSessionToken({
        userId: user.id,
        quiznexaId: user.quiznexaId || undefined,
        email: user.email,
        name: user.name,
        role: user.role as "ADMIN" | "CONTROLLER" | "STUDENT",
        department: user.department,
      });

      // Create active session record
      const expiresAt = role === "STUDENT"
        ? new Date(Date.now() + 12 * 60 * 60 * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.activeSession.create({
        data: {
          userId: user.id,
          role: role as "ADMIN" | "CONTROLLER" | "STUDENT",
          sessionToken: token,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
          expiresAt,
        },
      });

      const res = NextResponse.json({ success: true, redirectUrl: `/${role.toLowerCase()}/dashboard`, quiznexaId: user.quiznexaId });
      await setSessionCookie(token, user.role as "ADMIN" | "CONTROLLER" | "STUDENT");
      return res;
    }

    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
