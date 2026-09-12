"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, BookOpen, UserCheck, LogOut, X } from "lucide-react";

interface NavbarProps {
  user: {
    name: string;
    role: string;
    quiznexaId?: string;
    department?: string;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      sessionStorage.removeItem("quiznexa_tab_role");
      window.location.replace("/");
    } catch (error) {
      console.error("Logout failed:", error);
      sessionStorage.removeItem("quiznexa_tab_role");
      window.location.replace("/");
    }
  };

  return (
    <header className="border-b bg-white border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-lg text-indigo-700">
            <BookOpen className="w-6 h-6" />
            <span className="hidden sm:inline">QuizNexa</span>
          </div>

          {user && (
            <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
              {user.role === "ADMIN" && <span className="flex items-center gap-1 text-amber-700 font-semibold"><ShieldCheck className="w-4 h-4" /> Admin</span>}
              {user.role === "CONTROLLER" && <span className="flex items-center gap-1 text-emerald-700 font-semibold"><UserCheck className="w-4 h-4" /> Controller</span>}
              {user.role === "STUDENT" && (
                <>
                  <Link href="/student/quizzes" className="hover:text-indigo-600 transition">
                    Quizzes
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user?.role === "STUDENT" ? (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500">{user.role}{user.quiznexaId ? ` · ${user.quiznexaId}` : ""}</p>
              </div>
              <button
                onClick={() => setConfirmLogout(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-red-600"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
              {confirmLogout && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
                  <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Sign out?</h2><p className="mt-2 text-sm text-slate-600">Your active session will end and the access slot will become available.</p></div><button onClick={() => setConfirmLogout(false)} className="text-slate-400 hover:text-slate-700" aria-label="Cancel"><X size={18} /></button></div>
                    <div className="mt-6 flex justify-end gap-2"><button onClick={() => setConfirmLogout(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</button><button onClick={handleLogout} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Sign out</button></div>
                  </div>
                </div>
              )}
            </>
          ) : !user ? (
            <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Sign In
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
