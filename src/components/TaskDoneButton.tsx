"use client";

import { useState } from "react";

export function TaskDoneButton({ taskId }: { taskId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const complete = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/controller/tasks/${taskId}`, { method: "POST" });
      if (response.ok) {
        setCompleted(true);
        setMessage("Task completed successfully.");
        window.setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage("Unable to complete task.");
      }
    } catch {
      setMessage("Unable to complete task.");
    } finally {
      setBusy(false);
    }
  };
  return <div>{!completed && <button disabled={busy} onClick={complete} className="mt-3 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Done"}</button>}{completed && <p className="mt-3 text-sm font-medium text-emerald-700">Completed</p>}{message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}</div>;
}
