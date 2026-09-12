"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlatformMessage } from "@/components/PlatformMessage";

type Medal = { name: string; priority: number; color: string };

export default function RankingSettings({ params }: { params: Promise<{ id: string }> }) {
  const [quizId, setQuizId] = useState("");
  const [limit, setLimit] = useState("3");
  const [scope, setScope] = useState("BOTH");
  const [medals, setMedals] = useState<Medal[]>([
    { name: "Diamond", priority: 4, color: "#38bdf8" },
    { name: "Gold", priority: 3, color: "#f59e0b" },
    { name: "Silver", priority: 2, color: "#94a3b8" },
    { name: "Bronze", priority: 1, color: "#b45309" },
  ]);
  const [message, setMessage] = useState("");
  const router = useRouter();
  useEffect(() => { params.then(({ id }) => { setQuizId(id); fetch(`/api/quizzes/${id}/ranking`).then(res => res.json()).then(data => { setLimit(String(data.leaderboardLimit)); setScope(data.leaderboardScope); setMedals(data.medals); }); }); }, [params]);
  const save = async () => { const response = await fetch(`/api/quizzes/${quizId}/ranking`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leaderboardLimit: limit, leaderboardScope: scope, medals }) }); if (response.ok) router.back(); else setMessage("Ranking management is not granted by an admin."); };
   return (
     <main className="min-h-screen bg-slate-50 p-6">
       <div className="max-w-3xl mx-auto bg-white border rounded-lg p-6">
        <Link href="/controller/quizzes" className="text-emerald-700 hover:underline">Back to quizzes</Link>
         <h1 className="text-2xl font-bold">Leaderboard settings</h1>
         <p className="text-slate-600 mb-6">Choose how many students or teams appear and order medals by priority.</p>
         {message && <div className="mb-4"><PlatformMessage message={message} /></div>}
         <div className="grid md:grid-cols-2 gap-4">
           <label className="text-sm font-medium">Top count
             <input type="number" min="1" max="1000" value={limit} onChange={e => setLimit(e.target.value)} className="block border rounded px-3 py-2 w-full mt-1" />
           </label>
           <label className="text-sm font-medium">Rank students or teams
             <select value={scope} onChange={e => setScope(e.target.value)} className="block border rounded px-3 py-2 w-full mt-1">
               <option value="BOTH">Both</option>
               <option value="STUDENTS">Students</option>
               <option value="TEAMS">Teams</option>
             </select>
           </label>
         </div>
         <div className="mt-6 space-y-2">
           {medals.map((medal, index) => (
             <div key={index} className="flex gap-2">
               <input value={medal.name} onChange={e => setMedals(medals.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} className="border rounded px-3 py-2"/>
               <input type="number" value={medal.priority} onChange={e => setMedals(medals.map((item, i) => i === index ? { ...item, priority: Number(e.target.value) } : item))} className="border rounded px-3 py-2 w-24"/>
               <input type="color" value={medal.color} onChange={e => setMedals(medals.map((item, i) => i === index ? { ...item, color: e.target.value } : item))} className="h-10 w-14"/>
             </div>
           ))}
         </div>
         <button onClick={save} className="mt-6 px-5 py-2 bg-emerald-600 text-white rounded">Save ranking</button>
       </div>
     </main>
   );
}