import { requireController } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffSidebar } from "@/components/StaffSidebar";
import { PortalRefreshButton } from "@/components/PortalRefreshButton";

export default async function ControllerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireController();
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, quiznexaId: true, createdAt: true } });
  return <><StaffSidebar role="CONTROLLER" user={{ name: user?.name || session.name, quiznexaId: user?.quiznexaId || session.quiznexaId || null, joinedAt: user?.createdAt.toISOString() || null }} /><PortalRefreshButton /><div className="pt-20 lg:pl-64 lg:pt-0">{children}</div></>;
}
