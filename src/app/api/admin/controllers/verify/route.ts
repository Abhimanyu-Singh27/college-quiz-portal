import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminControllerScope } from "@/lib/admin-scope";

export async function GET(req: Request) {
  try {
    const session = await requireAdmin();

    const unverifiedControllers = await prisma.user.findMany({
      where: {
        ...adminControllerScope(session.userId),
        isControllerVerified: false,
        controllerRemoved: false,
      },
      select: {
        id: true,
        name: true,
        quiznexaId: true,
        createdAt: true,
        department: true,
        _count: { select: { createdQuizzes: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(unverifiedControllers);
  } catch (error) {
    console.error("Fetch unverified controllers error:", error);
    if (error instanceof Error && error.message.includes("Redirect")) {
      throw error;
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const { controllerId, approved, notes } = body;

    if (!controllerId) {
      return NextResponse.json({ error: "Controller ID required" }, { status: 400 });
    }

    if (approved) {
      // Verify controller
      const ownedController = await prisma.user.findFirst({ where: { ...adminControllerScope(session.userId), id: controllerId }, select: { id: true } });
      if (!ownedController) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
      const controller = await prisma.user.update({
        where: { id: controllerId },
        data: {
          isControllerVerified: true,
          controllerVerifiedAt: new Date(),
          controllerVerifiedBy: session.userId,
        },
      });

      // Log action
      await prisma.auditLog.create({
        data: {
          actorId: session.userId,
          action: "CONTROLLER_VERIFIED",
          details: `Verified controller: ${controller.name} (${controller.quiznexaId || "no QuizNexa ID"})${notes ? ` - ${notes}` : ""}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Controller verified successfully",
      });
    } else {
      // Reject controller - delete the controller account
      const controller = await prisma.user.delete({
        where: { id: controllerId },
      });

      // Log action
      await prisma.auditLog.create({
        data: {
          actorId: session.userId,
          action: "CONTROLLER_REJECTED",
          details: `Rejected controller: ${controller.name} (${controller.quiznexaId || "no QuizNexa ID"})${notes ? ` - ${notes}` : ""}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Controller rejected and removed",
      });
    }
  } catch (error) {
    console.error("Controller verification error:", error);
    if (error instanceof Error && error.message.includes("Redirect")) {
      throw error;
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
