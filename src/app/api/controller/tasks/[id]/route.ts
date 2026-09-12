import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CONTROLLER") return NextResponse.json({ error: "Controller access required" }, { status: 403 });
  const { id } = await params;
  const task = await prisma.task.findFirst({ where: { id, assignedToId: session.userId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const updated = await prisma.task.update({ where: { id }, data: { status: "COMPLETED" } });
  await prisma.auditLog.create({ data: { actorId: session.userId, action: "TASK_COMPLETED", targetId: id, details: `Completed task: ${task.title}` } });
  return NextResponse.json(updated);
}