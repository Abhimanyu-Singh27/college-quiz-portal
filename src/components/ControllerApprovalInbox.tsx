"use client";

import { useEffect, useRef, useState } from "react";
import { PlatformMessage } from "@/components/PlatformMessage";

type ApprovalRequest = { id: string; action: string; status: string; payload: string; createdAt: string; reviewedAt?: string | null; controller: { name: string; quiznexaId: string | null } };

export function ControllerApprovalInbox() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [message, setMessage] = useState("");
  const loading = useRef(false);
  const load = async () => {
    if (loading.current || document.visibilityState !== "visible") return;
    loading.current = true;
    try {
      const response = await fetch("/api/admin/controller-approvals", { cache: "no-store" });
      if (response.ok) setRequests(await response.json());
    } finally {
      loading.current = false;
    }
  };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 10000); return () => window.clearInterval(timer); }, []);
  const describe = (request: ApprovalRequest) => {
    try {
      const payload = JSON.parse(request.payload) as { title?: string; quizId?: string; teamName?: string; attemptId?: string; maxStudents?: number | null };
      if (request.action === "CREATE_QUIZ") return payload.title ? `Wants to create quiz: ${payload.title}` : "Wants to create a quiz";
      if (request.action === "GENERATE_LINK") return `Wants to generate a quiz join link${payload.maxStudents ? ` for ${payload.maxStudents} students` : ""}`;
      if (request.action === "ADD_TEAM") return payload.teamName ? `Wants to add team: ${payload.teamName}` : "Wants to add a team";
      return `Wants to perform: ${request.action.replaceAll("_", " ").toLowerCase()}`;
    } catch {
      return `Wants to perform: ${request.action.replaceAll("_", " ").toLowerCase()}`;
    }
  };
  const review = async (requestId: string, approved: boolean) => {
    const response = await fetch("/api/admin/controller-approvals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, approved }) });
    if (response.ok) {
      setRequests(current => current.map(request => request.id === requestId ? { ...request, status: approved ? "APPROVED" : "REJECTED", reviewedAt: new Date().toISOString() } : request));
      setMessage(approved ? "Controller action approved and recorded." : "Controller action rejected and recorded.");
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "Unable to record controller approval.");
    }
  };
  const pending = requests.filter(request => request.status === "PENDING");
  return <section className="mb-8 rounded-xl border border-emerald-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Controller approvals</h2><p className="mt-1 text-sm text-slate-600">Review controller actions before they are performed.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{pending.length} pending</span></div>{message && <div className="mt-4"><PlatformMessage message={message} tone={message.includes("Unable") ? "error" : "success"} /></div>}{requests.length ? <div className="mt-4 space-y-3">{requests.map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"><div><p className="font-semibold text-slate-900">{request.action.replaceAll("_", " ")}</p><p className="text-sm font-medium text-slate-700">{describe(request)}</p><p className="text-sm text-slate-600">{request.controller.name} · {request.controller.quiznexaId || "No QuizNexa ID"}</p>{request.status !== "PENDING" && <p className="mt-1 text-xs text-slate-500">Result: {request.status}{request.reviewedAt ? ` · ${new Date(request.reviewedAt).toLocaleString()}` : ""}</p>}</div>{request.status === "PENDING" && <div className="flex gap-2"><button type="button" onClick={() => void review(request.id, true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Approve</button><button type="button" onClick={() => void review(request.id, false)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Reject</button></div>}</div>)}</div> : <p className="mt-4 text-sm text-slate-500">No controller approval requests.</p>}</section>;
}
