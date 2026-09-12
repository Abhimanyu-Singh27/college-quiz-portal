import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { DEFAULT_CONTROLLER_FEATURES } from "@/lib/controller-features";

export async function hasControllerFeature(
  session: SessionPayload,
  feature: string,
  quizId?: string
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (session.role !== "CONTROLLER") return false;

  const permissions = await prisma.controllerPermission.findMany({
    where: {
      controllerId: session.userId,
      feature,
      isGranted: true,
      OR: quizId ? [{ quizId }, { quizId: null }] : [{ quizId: null }],
    },
    select: { quizId: true, isGranted: true },
  });

  const permission = permissions.find((item) => item.quizId === quizId) || permissions.find((item) => item.quizId === null);
  if (permission) return permission.isGranted;
  return DEFAULT_CONTROLLER_FEATURES.includes(feature as typeof DEFAULT_CONTROLLER_FEATURES[number]);
}
