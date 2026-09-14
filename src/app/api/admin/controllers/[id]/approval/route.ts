import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminControllerScope } from "@/lib/admin-scope";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { required } = await req.json().catch(() => ({}));
    const controller = await prisma.user.findFirst({ where: { ...adminControllerScope(session.userId), id, isControllerVerified: true, controllerRemoved: false }, select: { id: true } });
    if (!controller) return NextResponse.json({ error: "Active verified controller not found" }, { status: 404 });
    const updated = await prisma.user.update({ where: { id: controller.id }, data: { controllerApprovalRequired: required === true }, select: { controllerApprovalRequired: true } });
    return NextResponse.json({ approvalRequired: updated.controllerApprovalRequired });
  } catch (error) {
    console.error("Controller approval update error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update controller approval mode" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const controller = await prisma.user.findFirst({ where: { ...adminControllerScope(session.userId), id, isControllerVerified: true, controllerRemoved: false }, select: { controllerApprovalRequired: true } });
  if (!controller) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
  return NextResponse.json({ approvalRequired: controller.controllerApprovalRequired });
}
