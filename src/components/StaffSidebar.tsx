"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, BookOpen, CheckSquare, CircleGauge, History, LayoutDashboard, LogOut, Menu, Settings, UserCircle, Users, X } from "lucide-react";
import { useState } from "react";

type StaffAccount = { name: string; quiznexaId: string | null; joinedAt: string | null };

export function StaffSidebar({ role, user }: { role: "ADMIN" | "CONTROLLER"; user: StaffAccount }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const adminLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/quizzes", label: "Live quizzes", icon: Activity },
    { href: "/admin/quizzes/history", label: "Quiz history", icon: History },
    { href: "/admin/quizzes/create", label: "Create quiz", icon: BookOpen },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/controllers", label: "Controllers", icon: Users },
    { href: "/admin/session-config", label: "Session capacity", icon: Settings },
    { href: "/admin", label: "Audit log", icon: BarChart3 },
  ];
  const controllerLinks = [
    { href: "/controller/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/controller", label: "Create quiz", icon: BookOpen },
    { href: "/controller/quizzes", label: "Live quizzes", icon: Activity },
    { href: "/controller/quizzes/history", label: "Quiz history", icon: History },
    { href: "/controller/tasks", label: "Assigned tasks", icon: CheckSquare },
  ];
  const links = role === "ADMIN" ? adminLinks : controllerLinks;
  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/admin" || href === "/controller" || !pathname.startsWith(`${href}/`)) return false;
    return !links.some((link) => link.href !== href && (pathname === link.href || pathname.startsWith(`${link.href}/`)));
  };

  return <>
  <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#172a2d] text-white lg:flex">
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e5a83b] text-[#172a2d]"><CircleGauge size={20} /></span>
      <span className="text-lg font-semibold tracking-tight">QuizNexa</span>
    </div>
    <div className="border-b border-white/10 px-6 py-5"><p className="text-[11px] uppercase tracking-[0.18em] text-[#63d1ba]">Workspace</p><p className="mt-1 text-sm text-slate-300">{role === "ADMIN" ? "Administration" : "Controller"}</p></div>
    <nav className="flex-1 space-y-1 px-3 py-5">{links.map(({ href, label, icon: Icon }) => { const active = isActive(href); return <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${active ? "bg-[#1dbb9b] font-semibold text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon size={18} />{label}</Link>; })}</nav>
    <div className="relative border-t border-white/10 p-3">
      {accountOpen && <div className="absolute bottom-20 left-3 right-3 rounded-xl border border-white/10 bg-[#203a3d] p-4 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-[#63d1ba]">Profile</p><p className="mt-2 font-semibold text-white">{user.name}</p></div><button type="button" onClick={() => setAccountOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close account portal"><X size={17} /></button></div><dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-slate-400">QuizNexa ID</dt><dd className="text-right text-slate-100">{user.quiznexaId || "Not assigned"}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Joined</dt><dd className="text-right text-slate-100">{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : "Not available"}</dd></div></dl><button type="button" onClick={() => setConfirmLogout(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25"><LogOut size={16} />Log out</button></div>}
      <button type="button" onClick={() => setAccountOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-white/10" aria-expanded={accountOpen}><UserCircle className="text-[#63d1ba]" size={22} /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{user.name}</span><span className="block text-xs text-slate-400">Account portal</span></span></button>
    </div>
  </aside>
  <div className="fixed left-3 top-3 z-50 flex items-center gap-2 rounded-xl bg-white/95 p-1.5 pr-3 shadow-lg lg:hidden">
    <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} className="rounded-lg bg-[#172a2d] p-2.5 text-white"><Menu size={20} /></button>
    <span className="text-base font-semibold tracking-tight text-[#172a2d]">QuizNexa</span>
  </div>
  {menuOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
  <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(21rem,88vw)] flex-col bg-[#172a2d] text-white shadow-2xl transition-transform duration-200 lg:hidden ${menuOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Portal navigation">
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e5a83b] text-[#172a2d]"><CircleGauge size={20} /></span><span className="text-lg font-semibold tracking-tight">QuizNexa</span><button type="button" onClick={() => setMenuOpen(false)} className="ml-auto text-slate-400 hover:text-white" aria-label="Close navigation menu"><X size={20} /></button></div>
    <div className="border-b border-white/10 px-6 py-5"><p className="text-[11px] uppercase tracking-[0.18em] text-[#63d1ba]">Workspace</p><p className="mt-1 text-sm text-slate-300">{role === "ADMIN" ? "Administration" : "Controller"}</p></div>
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">{links.map(({ href, label, icon: Icon }) => { const active = isActive(href); return <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${active ? "bg-[#1dbb9b] font-semibold text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon size={18} />{label}</Link>; })}</nav>
    <div className="relative border-t border-white/10 p-3">
      {accountOpen && <div className="absolute bottom-20 left-3 right-3 rounded-xl border border-white/10 bg-[#203a3d] p-4 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-[#63d1ba]">Profile</p><p className="mt-2 font-semibold text-white">{user.name}</p></div><button type="button" onClick={() => setAccountOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close account portal"><X size={17} /></button></div><dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-slate-400">QuizNexa ID</dt><dd className="text-right text-slate-100">{user.quiznexaId || "Not assigned"}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Joined</dt><dd className="text-right text-slate-100">{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : "Not available"}</dd></div></dl><button type="button" onClick={() => setConfirmLogout(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25"><LogOut size={16} />Log out</button></div>}
      <button type="button" onClick={() => setAccountOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-white/10" aria-expanded={accountOpen}><UserCircle className="text-[#63d1ba]" size={22} /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{user.name}</span><span className="block text-xs text-slate-400">Account portal</span></span></button>
    </div>
  </aside>
  {confirmLogout && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Log out?</h2><p className="mt-2 text-sm text-slate-600">Your active session will end and the access slot will become available.</p></div><button type="button" onClick={() => setConfirmLogout(false)} className="text-slate-400 hover:text-slate-700" aria-label="Cancel"><X size={18} /></button></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setConfirmLogout(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</button><button type="button" onClick={async () => { await fetch(`/api/auth/logout?role=${role}`, { method: "POST" }); sessionStorage.removeItem("quiznexa_tab_role"); window.location.replace("/"); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Log out</button></div></div></div>}
  </>;
}
