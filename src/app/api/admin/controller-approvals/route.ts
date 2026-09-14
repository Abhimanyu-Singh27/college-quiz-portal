import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminControllerScope } from "@/lib/admin-scope";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const requests = await prisma.controllerApprovalRequest.findMany({ where: { status: "PENDING", controller: adminControllerScope(session.userId) }, include: { controller: { select: { name: true, quiznexaId: true } } }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { requestId, approved } = await req.json().catch(() => ({}));
  if (!requestId) return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  const request = await prisma.controllerApprovalRequest.findFirst({ where: { id: requestId, status: "PENDING", controller: adminControllerScope(session.userId) }, include: { controller: { select: { name: true, quiznexaId: true } } } });
  if (!request) return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
  const status = approved ? "APPROVED" : "REJECTED";
  await prisma.$transaction([
    prisma.controllerApprovalRequest.update({ where: { id: request.id }, data: { status, reviewedById: session.userId, reviewedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorId: session.userId, action: `CONTROLLER_APPROVAL_${status}`, details: `${status === "APPROVED" ? "Approved" : "Rejected"} ${request.action.replaceAll("_", " ")} for controller: ${request.controller.name} (${request.controller.quiznexaId || "no QuizNexa ID"})` } }),
  ]);
  return NextResponse.json({ success: true, status: approved ? "APPROVED" : "REJECTED" });
}
