"use client";

import { useState } from "react";
import { PlatformMessage } from "@/components/PlatformMessage";

type Activity = { id: string; action: string; details: string; timestamp: string; targetId?: string | null; undoData: string | null; undoneAt: string | null; quizExists?: boolean };

export function ControllerActivityPanel({ activities }: { activities: Activity[] }) {
  const [items, setItems] = useState(activities);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const currentQuizActivities = new Set(items.filter((item) => item.action.startsWith("QUIZ_") && item.targetId).reduce((current, item) => { if (!current.has(item.targetId!)) current.set(item.targetId!, item); return current; }, new Map<string, Activity>()).values().map((item) => item.id));

  const undo = async (activityId: string) => {
    setBusyId(activityId);
    setMessage("");
    try {
      const response = await fetch("/api/admin/controllers/activity/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to undo activity");
      setItems((current) => current.map((item) => item.id === activityId ? { ...item, undoneAt: new Date().toISOString() } : item));
      setMessage("Activity undone successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to undo activity");
    } finally {
      setBusyId("");
    }
  };

  return <section className="rounded-xl border bg-white p-6"><h2 className="font-semibold">Controller activity</h2><p className="mt-1 text-sm text-slate-500">Pause, resume, stop, continue, and participant actions are recorded here.</p>{message && <div className="mt-3"><PlatformMessage message={message} tone={message.includes("successfully") ? "success" : "error"} /></div>}<div className="mt-4 space-y-2">{items.length ? items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-3"><div><p className="text-sm font-medium text-slate-800">{item.action.replaceAll("_", " ")}</p><p className="text-sm text-slate-600">{item.details}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</p></div>{item.undoData && !item.undoneAt && item.quizExists !== false && (!item.action.startsWith("QUIZ_") || currentQuizActivities.has(item.id)) ? <button disabled={busyId === item.id} onClick={() => undo(item.id)} className="rounded bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{busyId === item.id ? "Undoing..." : "Undo"}</button> : item.undoneAt ? <span className="text-xs font-medium text-slate-400">Undone</span> : null}</div>) : <p className="text-sm text-slate-500">No controller activity recorded.</p>}</div></section>;
}
