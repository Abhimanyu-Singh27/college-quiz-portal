import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CONTROLLER") return NextResponse.json({ error: "Controller access required" }, { status: 403 });
  const { id } = await params;
  const request = await prisma.controllerApprovalRequest.findFirst({ where: { id, controllerId: session.userId }, select: { status: true, action: true, payload: true } });
  if (!request) return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
  return NextResponse.json({ status: request.status, action: request.action, payload: request.payload });
}
