"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuizDeleteButton({ quizId, title, onDeleted, refreshAfterDelete = false }: { quizId: string; title: string; onDeleted?: () => void; refreshAfterDelete?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const remove = async () => { setBusy(true); setError(""); try { const response = await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" }); if (!response.ok) { const data = await response.json().catch(() => ({})); setError(data.error || "Unable to delete quiz"); return; } setOpen(false); if (onDeleted) onDeleted(); else if (refreshAfterDelete) router.refresh(); else router.back(); } catch { setError("Unable to delete quiz"); } finally { setBusy(false); } };
  return <><button onClick={() => setOpen(true)} className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">Delete</button>{open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-semibold">Delete quiz?</h2><p className="mt-2 text-sm text-slate-600">Delete “{title}” and its attempts, teams, answers, and access links?</p>{error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={busy} onClick={remove} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Deleting..." : "Delete quiz"}</button></div></div></div>}</>;
}
