import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminControllerScope } from "@/lib/admin-scope";

export async function POST(req: Request) {
  const session = await requireAdmin();
  try {
    const { assignedToId, title, description, relatedQuizId, dueDate } = await req.json();
    if (!assignedToId || !title) return NextResponse.json({ error: "Controller and title are required" }, { status: 400 });
      const controller = await prisma.user.findFirst({ where: { ...adminControllerScope(session.userId), id: assignedToId }, select: { id: true } });
    if (!controller) return NextResponse.json({ error: "Selected controller was not found" }, { status: 404 });
    const task = await prisma.task.create({ data: { assignedToId, title, description, relatedQuizId: relatedQuizId || null, dueDate: dueDate ? new Date(dueDate) : null } });
    await prisma.auditLog.create({ data: { actorId: session.userId, action: "TASK_ASSIGNED", details: `Assigned task to controller ${assignedToId}: ${title}` } });
    return NextResponse.json(task, { status: 201 });
  } catch { return NextResponse.json({ error: "Unable to assign task" }, { status: 500 }); }
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  const controllerId = new URL(req.url).searchParams.get("controllerId");
  if (!controllerId) return NextResponse.json({ error: "controllerId is required" }, { status: 400 });

  const tasks = await prisma.task.findMany({
    where: { assignedToId: controllerId, assignedTo: adminControllerScope(session.userId) },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tasks });
}
