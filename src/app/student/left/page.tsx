import Link from "next/link";

export default function StudentLeftPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">You have left the quiz</h1>
        <p className="mt-3 text-slate-600">This temporary quiz session is closed.</p>
        <Link href="/student/left" className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
          Close
        </Link>
      </section>
    </main>
  );
}