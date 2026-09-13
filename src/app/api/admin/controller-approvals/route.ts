import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const requests = await prisma.controllerApprovalRequest.findMany({ where: { status: "PENDING" }, include: { controller: { select: { name: true, quiznexaId: true } } }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { requestId, approved } = await req.json().catch(() => ({}));
  if (!requestId) return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  const request = await prisma.controllerApprovalRequest.updateMany({ where: { id: requestId, status: "PENDING" }, data: { status: approved ? "APPROVED" : "REJECTED", reviewedById: session.userId, reviewedAt: new Date() } });
  if (!request.count) return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
  return NextResponse.json({ success: true, status: approved ? "APPROVED" : "REJECTED" });
}
