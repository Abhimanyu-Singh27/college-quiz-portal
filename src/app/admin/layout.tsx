import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffSidebar } from "@/components/StaffSidebar";
import { PortalRefreshButton } from "@/components/PortalRefreshButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, quiznexaId: true, createdAt: true } });
  return <><StaffSidebar role="ADMIN" user={{ name: user?.name || session.name, quiznexaId: user?.quiznexaId || session.quiznexaId || null, joinedAt: user?.createdAt.toISOString() || null }} /><PortalRefreshButton /><div className="lg:pl-64">{children}</div></>;
}
