import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

export async function requestControllerApproval(
  session: SessionPayload,
  action: string,
  payload: Record<string, unknown>
): Promise<{ approved: true } | { approved: false; requestId: string }> {
  if (session.role !== "CONTROLLER") return { approved: true };

  const controller = await prisma.user.findUnique({ where: { id: session.userId }, select: { controllerApprovalRequired: true } });
  if (!controller?.controllerApprovalRequired) return { approved: true };

  const approvalRequestId = typeof payload.approvalRequestId === "string" ? payload.approvalRequestId : null;
  if (approvalRequestId) {
    const request = await prisma.controllerApprovalRequest.findFirst({ where: { id: approvalRequestId, controllerId: session.userId, action, status: "APPROVED" } });
    if (request) {
      await prisma.controllerApprovalRequest.update({ where: { id: request.id }, data: { status: "CONSUMED" } });
      return { approved: true };
    }
  }

  const comparablePayload = { ...payload };
  delete comparablePayload.approvalRequestId;
  const approvedRequests = await prisma.controllerApprovalRequest.findMany({ where: { controllerId: session.userId, action, status: "APPROVED" }, orderBy: { reviewedAt: "desc" }, take: 10 });
  const matchingRequest = approvedRequests.find((request) => {
    try { return JSON.stringify(JSON.parse(request.payload)) === JSON.stringify(comparablePayload); } catch { return false; }
  });
  if (matchingRequest) {
    await prisma.controllerApprovalRequest.update({ where: { id: matchingRequest.id }, data: { status: "CONSUMED" } });
    return { approved: true };
  }

  const request = await prisma.controllerApprovalRequest.create({
    data: { controllerId: session.userId, action, payload: JSON.stringify(payload) },
  });
  return { approved: false, requestId: request.id };
}
