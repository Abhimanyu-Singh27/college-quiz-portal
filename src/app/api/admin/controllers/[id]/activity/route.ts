import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminControllerScope } from "@/lib/admin-scope";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const controller = await prisma.user.findFirst({ where: { ...adminControllerScope(session.userId), id }, select: { id: true } });
  if (!controller) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
  const activities = await prisma.auditLog.findMany({ where: { actorId: id }, orderBy: { timestamp: "desc" }, take: 100 });
  const ratings = await prisma.controllerRating.findMany({ where: { controllerId: id }, select: { rating: true } });
  const averageRating = ratings.length ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length : 0;
  const completedTasks = await prisma.task.count({ where: { assignedToId: id, status: "COMPLETED" } });
  return NextResponse.json({ activities, completedTasks, averageRating });
}