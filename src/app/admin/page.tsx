import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const auditLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { timestamp: "desc" },
    include: { actor: { select: { name: true, quiznexaId: true, role: true, isControllerVerified: true } } },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={session} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">College Admin Console</h1>
        <p className="text-sm text-slate-500 mb-8">Manage faculty roles and audit security logs.</p>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-10">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Faculty & Candidate Roles</h2>
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">QuizNexa ID</th>
                <th className="hidden px-6 py-3 md:table-cell">Department</th>
                <th className="px-6 py-3">Current Role</th>
                <th className="hidden px-6 py-3 text-right md:table-cell">Assign Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                  <td className="px-6 py-4">{u.quiznexaId || "Not assigned"}</td>
                  <td className="hidden px-6 py-4 md:table-cell">{u.department}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      u.role === "ADMIN" ? "bg-amber-100 text-amber-800" :
                      u.role === "CONTROLLER" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                    }`}>
                      {u.role === "CONTROLLER" && !u.isControllerVerified ? "Ex CONTROLLER" : u.role}
                    </span>
                  </td>
                  <td className="hidden px-6 py-4 text-right space-x-2 md:table-cell">
                    {u.role !== "ADMIN" && (
                      <form action="/api/admin/users" method="POST" className="inline-block">
                        <input type="hidden" name="targetUserId" value={u.id} />
                        <input type="hidden" name="newRole" value={u.role === "CONTROLLER" ? "STUDENT" : "CONTROLLER"} />
                        <button className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-800 border">
                          {u.role === "CONTROLLER" ? "Revoke Controller" : "Make Controller"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Tamper-Proof Audit Trail</h2>
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex justify-between items-center text-xs border-b pb-2">
                <div>
                  <span className="font-bold text-slate-700">{log.action}</span> - {log.details}
                  <p className="text-slate-400">By: {log.actor.name} ({log.actor.quiznexaId || "No QuizNexa ID"})</p>
                  <p className="mt-1"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${log.actor.role === "ADMIN" ? "bg-amber-100 text-amber-800" : log.actor.role === "CONTROLLER" && log.actor.isControllerVerified ? "bg-emerald-100 text-emerald-800" : log.actor.role === "CONTROLLER" ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-800"}`}>{log.actor.role === "ADMIN" ? "Current admin" : log.actor.role === "CONTROLLER" && log.actor.isControllerVerified ? "Current controller" : log.actor.role === "CONTROLLER" ? "Former controller" : "Current student"}</span></p>
                </div>
                <time className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</time>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
