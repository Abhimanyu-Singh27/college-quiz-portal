import type { Prisma } from "@prisma/client";

export function adminControllerScope(adminId: string): Prisma.UserWhereInput {
  return {
    role: "CONTROLLER",
    OR: [{ assignedByAdminId: adminId }, { controllerVerifiedBy: adminId }],
  };
}

export function adminQuizScope(adminId: string): Prisma.QuizWhereInput {
  return {
    OR: [
      { createdById: adminId },
      { createdBy: { assignedByAdminId: adminId } },
    ],
  };
}

export function adminActorScope(adminId: string): Prisma.AuditLogWhereInput {
  return {
    OR: [
      { actorId: adminId },
      { actor: { assignedByAdminId: adminId } },
    ],
  };
}