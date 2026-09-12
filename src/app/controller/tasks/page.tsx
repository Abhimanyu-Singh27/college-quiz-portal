import { requireController } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TaskDoneButton } from "@/components/TaskDoneButton";

export default async function ControllerTasks() {
  const session = await requireController();
  const tasks = await prisma.task.findMany({ where: { assignedTo: { OR: [{ id: session.userId }, { email: session.email }] } }, orderBy: { createdAt: "desc" } });
  return <main className="min-h-screen bg-slate-50 p-6"><div className="max-w-4xl mx-auto"><Link href="/controller/dashboard" className="text-emerald-700 hover:underline">Back to dashboard</Link><h1 className="mt-4 text-2xl font-bold">Assigned tasks</h1><div className="mt-6 space-y-3">{tasks.length ? tasks.map(task => <div key={task.id} className="rounded-lg border bg-white p-4"><div className="flex justify-between"><b>{task.title}</b><span className="text-sm text-slate-500">{task.status}</span></div>{task.description && <p className="mt-2 text-sm text-slate-600">{task.description}</p>}{task.status !== "COMPLETED" && <TaskDoneButton taskId={task.id} />}</div>) : <p className="rounded-lg border bg-white p-6 text-slate-500">No tasks assigned.</p>}</div></div></main>;
}
