import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONTROLLER_FEATURES } from "@/lib/controller-features";

export async function POST(req: Request) {
  try {
    // Verify admin authentication
    const session = await requireAdmin();

    const body = await req.json();
    const { name, quiznexaId, password } = body;

    if (!name || !quiznexaId || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const normalizedQuizNexaId = String(quiznexaId).trim().toUpperCase();
    let existingUser = await prisma.user.findUnique({
      where: { quiznexaId: normalizedQuizNexaId },
    });

    if (existingUser && existingUser.isControllerVerified && !existingUser.controllerRemoved) {
      return NextResponse.json({ error: "QuizNexa ID already registered" }, { status: 409 });
    }

    // A removed controller must never be reactivated, because that would restore
    // the previous controller's tasks, ratings, permissions, and audit history.
    if (existingUser?.controllerRemoved) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { email: `removed-${existingUser.id}-${Date.now()}@quiznexa.local`, quiznexaId: null },
      });
      existingUser = null;
    }

    const controller = existingUser
      ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password,
          role: "CONTROLLER",
          department: "Academic",
          isControllerVerified: true,
          controllerRemoved: false,
          controllerVerifiedAt: new Date(),
          controllerVerifiedBy: session.userId,
        },
      })
      : await prisma.user.create({
        data: {
        email: `controller-${normalizedQuizNexaId.toLowerCase()}@quiznexa.local`,
        quiznexaId: normalizedQuizNexaId,
        name,
        password, // In production, use bcrypt
        role: "CONTROLLER",
        department: "Academic",
        isControllerVerified: true,
        controllerVerifiedAt: new Date(),
        controllerVerifiedBy: session.userId,
        controllerRemoved: false,
      },
      });

    await prisma.controllerPermission.deleteMany({ where: { controllerId: controller.id } });
    for (const feature of DEFAULT_CONTROLLER_FEATURES) {
      await prisma.controllerPermission.create({ data: { controllerId: controller.id, feature, isGranted: true, grantedById: session.userId } });
    }

    const sessionConfig = await prisma.sessionConfig.findFirst();
    if (sessionConfig) {
      await prisma.sessionConfig.update({ where: { id: sessionConfig.id }, data: { controllersConfigured: true } });
    } else {
      await prisma.sessionConfig.create({ data: { controllersConfigured: true } });
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "CONTROLLER_CREATED",
        details: `Created controller: ${name} (${normalizedQuizNexaId})`,
      },
    });

    return NextResponse.json(
      {
        message: "Controller created successfully",
        controller: {
          id: controller.id,
          name: controller.name,
          quiznexaId: controller.quiznexaId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Redirect")) {
      throw error; // Re-throw redirect errors
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
