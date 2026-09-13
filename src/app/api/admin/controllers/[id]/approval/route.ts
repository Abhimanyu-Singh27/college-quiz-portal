import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { id } = await params;
  const { required } = await req.json().catch(() => ({}));
  const controller = await prisma.user.updateMany({ where: { id, role: "CONTROLLER" }, data: { controllerApprovalRequired: required !== false } });
  if (!controller.count) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
  return NextResponse.json({ approvalRequired: required !== false });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { id } = await params;
  const controller = await prisma.user.findFirst({ where: { id, role: "CONTROLLER" }, select: { controllerApprovalRequired: true } });
  if (!controller) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
  return NextResponse.json({ approvalRequired: controller.controllerApprovalRequired });
}
