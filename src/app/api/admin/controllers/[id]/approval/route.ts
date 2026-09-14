import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { required } = await req.json().catch(() => ({}));
    const controller = await prisma.user.updateMany({ where: { id, role: "CONTROLLER", isControllerVerified: true, controllerRemoved: false }, data: { controllerApprovalRequired: required !== false } });
    if (!controller.count) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
    return NextResponse.json({ approvalRequired: required !== false });
  } catch (error) {
    console.error("Controller approval update error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update controller approval mode" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const controller = await prisma.user.findFirst({ where: { id, role: "CONTROLLER", isControllerVerified: true, controllerRemoved: false }, select: { controllerApprovalRequired: true } });
  if (!controller) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
  return NextResponse.json({ approvalRequired: controller.controllerApprovalRequired });
}
