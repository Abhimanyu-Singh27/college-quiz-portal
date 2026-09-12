"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlatformMessage } from "@/components/PlatformMessage";

type Task = { id: string; title: string; description: string | null; status: string; createdAt: string; dueDate: string | null };

export default function AssignTasks({ params }: { params: Promise<{ id: string }> }) {
  const [controllerId, setControllerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTasks = async (id: string) => {
    const response = await fetch(`/api/admin/tasks?controllerId=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load assigned tasks");
    const data = await response.json();
    setTasks(data.tasks);
  };

  useEffect(() => {
    params.then(({ id }) => {
      setControllerId(id);
      loadTasks(id).catch(() => setError("Unable to load assigned tasks."));
    });
  }, [params]);

  const save = async () => {
    setError("");
    setMessage("");
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignedToId: controllerId, title: title.trim(), description: description.trim() || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to assign task");
      setTasks((current) => [data, ...current]);
      setTitle("");
      setDescription("");
      setMessage("Task assigned successfully.");
      window.setTimeout(() => setMessage(""), 5000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to assign task");
    } finally {
      setSaving(false);
    }
  };

  return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-2xl"><Link href="/admin/controllers" className="text-amber-700 hover:underline">Back to controllers</Link><section className="mt-4 rounded-xl border bg-white p-6"><h1 className="text-2xl font-bold">Assign task</h1><div className="mt-4 space-y-2">{error && <PlatformMessage message={error} />}{message && <PlatformMessage message={message} tone="success" />}</div><label className="mt-6 block text-sm font-medium">Task title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><label className="mt-4 block text-sm font-medium">Details<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border p-3" rows={5} /></label><button disabled={saving} onClick={save} className="mt-5 rounded-lg bg-amber-600 px-5 py-2 text-white disabled:opacity-60">{saving ? "Assigning..." : "Assign task"}</button></section><section className="mt-6 rounded-xl border bg-white p-6"><h2 className="text-xl font-semibold">Tasks assigned to this controller</h2><div className="mt-4 space-y-3">{tasks.length ? tasks.map((task) => <article key={task.id} className="rounded-lg border bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{task.title}</h3><span className="text-xs font-medium text-slate-500">{task.status}</span></div>{task.description && <p className="mt-2 text-sm text-slate-600">{task.description}</p>}<p className="mt-2 text-xs text-slate-500">Assigned {new Date(task.createdAt).toLocaleString()}</p></article>) : <p className="text-sm text-slate-500">No tasks assigned yet.</p>}</div></section></div></main>;
}
