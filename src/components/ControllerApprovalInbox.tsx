"use client";

import { useEffect, useState } from "react";
import { PlatformMessage } from "@/components/PlatformMessage";

type ApprovalRequest = { id: string; action: string; createdAt: string; controller: { name: string; quiznexaId: string | null } };

export function ControllerApprovalInbox() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [message, setMessage] = useState("");
  const load = async () => {
    const response = await fetch("/api/admin/controller-approvals", { cache: "no-store" });
    if (response.ok) setRequests(await response.json());
  };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 3000); return () => window.clearInterval(timer); }, []);
  const review = async (requestId: string, approved: boolean) => {
    const response = await fetch("/api/admin/controller-approvals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, approved }) });
    if (response.ok) { setRequests(current => current.filter(request => request.id !== requestId)); setMessage(approved ? "Controller action approved." : "Controller action rejected."); }
  };
  return <section className="mb-8 rounded-xl border border-emerald-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Controller approvals</h2><p className="mt-1 text-sm text-slate-600">Review controller actions before they are performed.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{requests.length} pending</span></div>{message && <div className="mt-4"><PlatformMessage message={message} tone="success" /></div>}{requests.length ? <div className="mt-4 space-y-3">{requests.map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"><div><p className="font-semibold text-slate-900">{request.action.replaceAll("_", " ")}</p><p className="text-sm text-slate-600">{request.controller.name} · {request.controller.quiznexaId || "No QuizNexa ID"}</p></div><div className="flex gap-2"><button type="button" onClick={() => void review(request.id, true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Approve</button><button type="button" onClick={() => void review(request.id, false)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Reject</button></div></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No pending controller actions.</p>}</section>;
}
