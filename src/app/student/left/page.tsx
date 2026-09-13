"use client";

import { useEffect } from "react";

export default function StudentLeftPage() {
  useEffect(() => {
    window.history.pushState({ quizNexaLeft: true }, "", window.location.href);
    const keepStudentOnExitPage = () => window.history.pushState({ quizNexaLeft: true }, "", window.location.href);
    window.addEventListener("popstate", keepStudentOnExitPage);
    return () => window.removeEventListener("popstate", keepStudentOnExitPage);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">You have left the quiz</h1>
        <p className="mt-3 text-slate-600">Thank you for joining QuizNexa.</p>
        <p className="mt-3 text-slate-600">Your answer is submitted. You cannot attempt this quiz again.</p>
      </section>
    </main>
  );
}