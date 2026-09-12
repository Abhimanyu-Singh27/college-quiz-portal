"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlatformMessage } from "@/components/PlatformMessage";
import { DEFAULT_CONTROLLER_FEATURES } from "@/lib/controller-features";

const features = [...DEFAULT_CONTROLLER_FEATURES, "CONTROLLERS", "SESSION_CAPACITY", "ANALYTICS", "AUDIT_LOG"];
const featureLabel = (feature: string) => feature.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, value => value.toUpperCase());

export default function ControllerPermissions({ params }: { params: Promise<{ id: string }> }) {
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); const router = useRouter();
  useEffect(() => { params.then(({ id }) => fetch(`/api/admin/controllers/${id}/permissions`).then(async response => { if (!response.ok) throw new Error(); return response.json(); }).then(items => { const values = Object.fromEntries(features.map(feature => [feature, DEFAULT_CONTROLLER_FEATURES.includes(feature as typeof DEFAULT_CONTROLLER_FEATURES[number])])); items.forEach((item: { feature: string; isGranted: boolean }) => { values[item.feature] = item.isGranted; }); setSaved(values); setDraft(values); }).catch(() => setError("Unable to load controller access settings."))); }, [params]);
  const save = async () => { setError(""); setMessage(""); try { const { id } = await params; const response = await fetch(`/api/admin/controllers/${id}/permissions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissions: features.map(feature => ({ feature, granted: Boolean(draft[feature]) })) }) }); if (!response.ok) throw new Error(); router.back(); } catch { setError("Unable to save access settings. No changes were applied."); } };
  const cancel = () => { setDraft(saved); setError(""); setMessage(""); };
  return <main className="min-h-screen bg-slate-50 p-6"><div className="max-w-2xl mx-auto bg-white border rounded-xl p-6"><Link href="/admin/controllers" className="text-amber-700 hover:underline">Back to controllers</Link><h1 className="text-2xl font-bold mt-4">Controller feature access</h1><p className="mt-2 text-sm text-slate-500">Choose independently for this controller.</p><div className="mt-4 space-y-2">{error && <PlatformMessage message={error} />}{message && <PlatformMessage message={message} tone="success" />}</div><div className="mt-6 space-y-3">{features.map(feature => <label key={feature} className="flex items-center justify-between rounded-lg border p-4"><span>{featureLabel(feature)}</span><input type="checkbox" checked={Boolean(draft[feature])} onChange={event => setDraft(current => ({ ...current, [feature]: event.target.checked }))} className="h-5 w-5" /></label>)}</div><div className="mt-6 flex justify-end gap-3"><button onClick={cancel} className="rounded-lg border border-slate-300 px-5 py-2 text-slate-700">Cancel</button><button onClick={save} className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white">Save changes</button></div></div></main>;
}
