import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  try {
    const { id } = await params;
    const controller = await prisma.user.findFirst({ where: { id, role: "CONTROLLER" } });
    if (!controller) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { isControllerVerified: false, controllerRemoved: true } }),
      prisma.activeSession.updateMany({ where: { userId: id, logoutAt: null }, data: { logoutAt: new Date() } }),
    ]);
    await prisma.auditLog.create({ data: { actorId: session.userId, action: "CONTROLLER_REMOVED", details: `Removed controller: ${controller.name} (${controller.quiznexaId || "no QuizNexa ID"})` } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove controller error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to remove controller" }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return DELETE(req, context);
}