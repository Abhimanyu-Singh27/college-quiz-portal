"use client";

import Link from "next/link";
import { Calendar, Star } from "lucide-react";
import { useState } from "react";
import { PlatformMessage } from "@/components/PlatformMessage";

type Activity = { id: string; action: string; details: string; timestamp: string; targetId?: string | null; undoData?: string | null; undoneAt?: string | null; quizExists?: boolean };
type Controller = { id: string; name: string; quiznexaId: string | null; controllerApprovalRequired: boolean; createdAt: string; createdQuizzes: { id: string }[]; assignedTasks: { id: string; status: string }[]; completedTasks: number; averageRating: number; activity: Activity[] };

export function ControllerList({ initialControllers }: { initialControllers: Controller[] }) {
  const [controllers, setControllers] = useState(initialControllers);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<Record<string, number>>(() => Object.fromEntries(initialControllers.map((item) => [item.id, Math.round(item.averageRating)])));
  const [pendingRemoval, setPendingRemoval] = useState<Controller | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const recommended = controllers.filter((controller) => controller.averageRating > 4).sort((a, b) => b.averageRating - a.averageRating);
  const currentQuizActivities = new Set(controllers.flatMap((controller) => controller.activity).filter((item) => item.action.startsWith("QUIZ_") && item.targetId).reduce((current, item) => { if (!current.has(item.targetId!)) current.set(item.targetId!, item); return current; }, new Map<string, Activity>()).values().map((item) => item.id));

  const remove = async (controller: Controller) => {
    setBusyAction(`remove:${controller.id}`);
    const response = await fetch(`/api/admin/controllers/${controller.id}`, { method: "DELETE" });
    if (!response.ok) { setMessage("Unable to remove this controller."); setBusyAction(""); return; }
    setControllers((current) => current.filter((item) => item.id !== controller.id));
    setPendingRemoval(null);
    setMessage(`${controller.name} was removed.`);
    setBusyAction("");
  };

  const saveRating = async (controllerId: string) => {
    setBusyAction(`rating:${controllerId}`);
    const response = await fetch(`/api/admin/controllers/${controllerId}/rating`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: rating[controllerId] }) });
    setMessage(response.ok ? "Controller rating saved." : "Unable to save rating.");
    setBusyAction("");
  };

  const toggleApproval = async (controller: Controller) => {
    setBusyAction(`approval:${controller.id}`);
    const response = await fetch(`/api/admin/controllers/${controller.id}/approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ required: !controller.controllerApprovalRequired }) });
    if (response.ok) setControllers(current => current.map(item => item.id === controller.id ? { ...item, controllerApprovalRequired: !controller.controllerApprovalRequired } : item));
    else setMessage("Unable to update controller approval mode.");
    setBusyAction("");
  };

  const undo = async (activityId: string) => {
    setBusyAction(`undo:${activityId}`);
    try {
      const response = await fetch("/api/admin/controllers/activity/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to undo this activity.");
      setControllers((current) => current.map((controller) => ({ ...controller, activity: controller.activity.map((item) => item.id === activityId ? { ...item, undoneAt: new Date().toISOString() } : item) })));
      setMessage("Activity undone successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to undo this activity.");
    } finally {
      setBusyAction("");
    }
  };

  return <>
    {message && <div className="mb-4"><PlatformMessage message={message} tone={message.startsWith("Unable") ? "error" : "success"} /></div>}
    {recommended.length > 0 && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-900">Recommended controllers for future assignment</p><p className="mt-1 text-sm text-amber-800">{recommended.map((controller) => `${controller.name} (${controller.averageRating.toFixed(1)}/5)`).join(", ")}</p></div>}
    {pendingRemoval && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-semibold">Remove controller?</h2><p className="mt-2 text-sm text-slate-600">Remove {pendingRemoval.name} from the approved controller list?</p><div className="mt-6 flex justify-end gap-2"><button disabled={busyAction === `remove:${pendingRemoval.id}`} onClick={() => setPendingRemoval(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={busyAction === `remove:${pendingRemoval.id}`} onClick={() => remove(pendingRemoval)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busyAction === `remove:${pendingRemoval.id}` ? "Removing..." : "Remove"}</button></div></div></div>}
    <div className="grid gap-4">{controllers.length > 0 ? controllers.map((controller) => <div key={controller.id} className="rounded-lg border border-slate-200 bg-white p-6"><div className="mb-4 flex items-start justify-between"><div><h3 className="text-lg font-bold text-slate-900">{controller.name}</h3><div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600"><span>QuizNexa ID: {controller.quiznexaId || "Not assigned"}</span><span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Assigned {new Date(controller.createdAt).toLocaleDateString()}</span></div></div><div className="text-right text-sm"><p><b>{controller.createdQuizzes.length}</b> quizzes created</p><p><b>{controller.completedTasks}</b> tasks completed</p><p><b>{controller.averageRating.toFixed(1)}</b> / 5 rating</p></div></div>
      <div className="mb-4 flex items-center gap-2 border-t pt-4"><span className="text-sm font-medium">Admin rating:</span>{[1, 2, 3, 4, 5].map((value) => <button key={value} title={`${value} stars`} onClick={() => setRating((current) => ({ ...current, [controller.id]: value }))} className={value <= (rating[controller.id] || 0) ? "text-amber-500" : "text-slate-300"}><Star size={18} fill="currentColor" /></button>)}<button disabled={busyAction === `rating:${controller.id}`} onClick={() => saveRating(controller.id)} className="ml-2 rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">{busyAction === `rating:${controller.id}` ? "Saving..." : "Save rating"}</button></div>
      {controller.activity.length > 0 && <div className="mb-4 rounded-lg bg-slate-50 p-3"><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Controller activity</p>{controller.activity.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0"><p className="text-xs text-slate-600">{item.action}: {item.details}</p>{item.undoData && !item.undoneAt && item.quizExists !== false && (!item.action.startsWith("QUIZ_") || currentQuizActivities.has(item.id)) && <button disabled={busyAction === `undo:${item.id}`} onClick={() => undo(item.id)} className="shrink-0 rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 disabled:opacity-60">{busyAction === `undo:${item.id}` ? "Undoing..." : "Undo"}</button>}{item.undoneAt && <span className="shrink-0 text-xs text-slate-400">Undone</span>}</div>)}</div>}
      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4"><Link href={`/admin/controllers/${controller.id}`} className="flex-1 rounded bg-blue-50 py-2 text-center font-medium text-blue-700">View details</Link><Link href={`/admin/controllers/${controller.id}/tasks`} className="flex-1 rounded bg-indigo-50 py-2 text-center font-medium text-indigo-700">Assign tasks</Link><button disabled={busyAction === `approval:${controller.id}`} onClick={() => void toggleApproval(controller)} className={`flex-1 rounded py-2 font-medium text-white disabled:opacity-60 ${controller.controllerApprovalRequired ? "bg-emerald-600" : "bg-red-600"}`}>{busyAction === `approval:${controller.id}` ? "Saving..." : controller.controllerApprovalRequired ? "Approval" : "Free"}</button><button onClick={() => setPendingRemoval(controller)} className="flex-1 rounded bg-red-50 py-2 font-medium text-red-700">Remove</button></div>
    </div>) : <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center"><p className="text-slate-600">No controllers found.</p></div>}</div>
  </>;
}
