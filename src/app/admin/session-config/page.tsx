"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlatformMessage } from "@/components/PlatformMessage";

export default function SessionConfigPage() {
  const [controllerLimit, setControllerLimit] = useState("2");
  const [controllerActive, setControllerActive] = useState(0);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/session-config").then((response) => response.json()).then((data) => {
      setControllerLimit(String(data.config.maxConcurrentControllers));
      setControllerActive(data.activeSessions.byRole.controller);
    });
  }, []);

  const save = async () => {
    const response = await fetch("/api/admin/session-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxConcurrentControllers: Number(controllerLimit) }),
    });
    if (response.ok) router.back();
    else setMessage("Choose a number from 1 to 4");
  };

  return <main className="min-h-screen bg-slate-50 p-6"><div className="max-w-2xl mx-auto bg-white border rounded-lg p-6"><h1 className="text-2xl font-bold text-slate-900">Controller capacity</h1><p className="text-slate-600 mt-1 mb-6">Only controller sessions consume the configured slots. Signing out releases a slot immediately.</p><div className="border rounded p-4 mb-6"><p className="text-sm text-slate-500">Controller slots</p><p className="text-2xl font-bold">{controllerActive} / {controllerLimit}</p></div><label className="block font-medium">Controller slots (1–4)<input type="number" min="1" max="4" value={controllerLimit} onChange={(event) => setControllerLimit(event.target.value)} className="block border rounded px-3 py-2 mt-1 w-full" /></label><button onClick={save} className="mt-4 bg-amber-600 text-white px-4 py-2 rounded">Save capacity</button>{message && <div className="mt-3"><PlatformMessage message={message} /></div>}</div></main>;
}