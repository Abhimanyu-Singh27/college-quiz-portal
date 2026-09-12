"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Option = { id: string; text: string };
type QuestionDraft = { content: string; options: Option[]; correctOption: string; marks: number };
const newQuestion = (): QuestionDraft => ({ content: "", options: ["a", "b", "c", "d"].map(id => ({ id, text: "" })), correctOption: "a", marks: 1 });

export default function AdminQuizCreatePage() {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [maxViolations, setMaxViolations] = useState("3");
  const [quizType, setQuizType] = useState("INDIVIDUAL");
  const [allowIndividualInTeam, setAllowIndividualInTeam] = useState(false);
  const [teamSize, setTeamSize] = useState("3");
  const [presentationMode, setPresentationMode] = useState("NORMAL");
  const [resultsDisplayInterval, setResultsDisplayInterval] = useState("0");
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const updateQuestion = (index: number, update: Partial<QuestionDraft>) => setQuestions(current => current.map((question, questionIndex) => questionIndex === index ? { ...question, ...update } : question));
  const publish = async () => {
    setError(""); setSaving(true);
    try {
      const response = await fetch("/api/quizzes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, durationMinutes: duration, maxViolations, quizType, teamSize, allowIndividualInTeam, presentationMode, resultsDisplayInterval, questions }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create quiz");
      router.push("/admin/quizzes?message=Quiz%20created%20successfully.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create quiz"); } finally { setSaving(false); }
  };

  return <main className="min-h-screen bg-slate-50 p-6"><div className="max-w-4xl mx-auto rounded-xl border bg-white p-6 shadow-sm">
    <Link href="/admin/quizzes" className="text-amber-700 hover:underline">Back to quizzes</Link>
    <h1 className="mt-4 text-2xl font-bold text-slate-900">Create quiz</h1>
    {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-medium">Quiz title<input value={title} onChange={event => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="text-sm font-medium">Duration (minutes)<input type="number" min="1" value={duration} onChange={event => setDuration(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="text-sm font-medium">Tab violation limit<input type="number" min="0" value={maxViolations} onChange={event => setMaxViolations(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="text-sm font-medium">Quiz type<select value={quizType} onChange={event => setQuizType(event.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="INDIVIDUAL">Individual</option><option value="TEAM">Team</option></select></label>
      {quizType === "TEAM" && <label className="text-sm font-medium">Students per team<input type="number" min="2" max="100" value={teamSize} onChange={event => setTeamSize(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>}
      {quizType === "TEAM" && <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={allowIndividualInTeam} onChange={event => setAllowIndividualInTeam(event.target.checked)} /> Allow individual participants</label>}
      <label className="text-sm font-medium">Experience<select value={presentationMode} onChange={event => setPresentationMode(event.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="NORMAL">Normal</option><option value="FUN">Fun mode</option></select></label>
      <label className="text-sm font-medium">Show results after<select value={resultsDisplayInterval} onChange={event => setResultsDisplayInterval(event.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="0">Final result only</option><option value="1">Every question</option><option value="2">Every 2 questions</option><option value="3">Every 3 questions</option><option value="5">Every 5 questions</option><option value="10">Every 10 questions</option></select></label>
    </div>
    <div className="mt-6 space-y-4">{questions.map((question, index) => <section key={index} className="rounded-lg border bg-slate-50 p-4"><div className="flex justify-between"><b>Question {index + 1}</b>{questions.length > 1 && <button type="button" onClick={() => setQuestions(current => current.filter((_, questionIndex) => questionIndex !== index))} className="text-red-600">Remove</button>}</div><input value={question.content} onChange={event => updateQuestion(index, { content: event.target.value })} placeholder="Question text" className="mt-3 w-full rounded-lg border p-3" /><div className="mt-2 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <input key={option.id} value={option.text} onChange={event => updateQuestion(index, { options: question.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, text: event.target.value } : item) })} placeholder={`Option ${option.id.toUpperCase()}`} className="rounded-lg border p-2" />)}</div><label className="mt-3 block text-sm font-medium">Correct answer<select value={question.correctOption} onChange={event => updateQuestion(index, { correctOption: event.target.value })} className="ml-2 rounded-lg border p-2"><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></label></section>)}</div>
    <div className="mt-6 flex justify-between"><button type="button" onClick={() => setQuestions(current => [...current, newQuestion()])} className="rounded-lg border px-4 py-2">Add question</button><button type="button" disabled={saving} onClick={publish} className="rounded-lg bg-amber-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Creating..." : "Create quiz"}</button></div>
  </div></main>;
}
