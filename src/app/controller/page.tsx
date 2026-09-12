"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PlatformMessage } from "@/components/PlatformMessage";

export default function ControllerPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [maxViolations, setMaxViolations] = useState("3");
  const [resultsDisplayInterval, setResultsDisplayInterval] = useState("0");
  const [presentationMode, setPresentationMode] = useState<"NORMAL" | "FUN">("NORMAL");
  const [allowIndividualInTeam, setAllowIndividualInTeam] = useState(false);
  const [questions, setQuestions] = useState([
    {
      content: "What is the worst-case time complexity of QuickSort?",
      options: [
        { id: "a", text: "O(n log n)" },
        { id: "b", text: "O(n^2)" },
        { id: "c", text: "O(n)" },
        { id: "d", text: "O(log n)" },
      ],
      correctOption: "b",
      marks: 2,
    },
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        content: "",
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
          { id: "c", text: "" },
          { id: "d", text: "" },
        ],
        correctOption: "a",
        marks: 1,
      },
    ]);
  };

  const handleCreate = async () => {
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        durationMinutes: duration,
        maxViolations,
        resultsDisplayInterval,
        presentationMode,
        allowIndividualInTeam,
        questions,
      }),
    });

    if (res.ok) {
      setMessageTone("success");
      setMessage("Quiz published successfully.");
      router.push("/controller/dashboard?message=Quiz%20created%20successfully.");
    } else {
      setMessageTone("error");
      const data = await res.json().catch(() => null);
      setMessage(data?.error || "Failed to publish quiz.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <button type="button" onClick={() => router.push("/controller/dashboard")} className="mb-4 text-sm text-emerald-700 hover:underline">Back to controller dashboard</button>
        <h1 className="text-xl font-bold text-slate-800 mb-1">Controller: Create New Examination</h1>
        <p className="text-xs text-slate-500 mb-6">Create questions, set options, and configure proctor limits.</p>
        {message && <div className="mb-6"><PlatformMessage message={message} tone={messageTone} /></div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-600 block mb-1">Quiz Title</label>
            <input
              type="text"
              placeholder="e.g. Mid-term CS301"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Duration (Minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={allowIndividualInTeam} onChange={e => setAllowIndividualInTeam(e.target.checked)} /> Allow individual participants</label>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Quiz Experience</label>
            <select value={presentationMode} onChange={(e) => setPresentationMode(e.target.value as "NORMAL" | "FUN")} className="w-full border rounded-lg p-2 text-sm bg-white">
              <option value="NORMAL">Normal</option>
              <option value="FUN">Fun mode</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Fun mode fixes the question while answer choices float below.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Max Tab Switch Violations</label>
            <input
              type="number"
              value={maxViolations}
              onChange={(e) => setMaxViolations(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Show results after</label>
            <select value={resultsDisplayInterval} onChange={(e) => setResultsDisplayInterval(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-white"><option value="0">Final result only</option><option value="1">Every question</option><option value="2">Every 2 questions</option><option value="3">Every 3 questions</option><option value="5">Every 5 questions</option><option value="10">Every 10 questions</option></select>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="p-4 border rounded-lg bg-slate-50/50 relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700">Question #{qIndex + 1}</span>
                {questions.length > 1 && (
                  <button
                    onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Question Statement"
                value={q.content}
                onChange={(e) => {
                  const copy = [...questions];
                  copy[qIndex].content = e.target.value;
                  setQuestions(copy);
                }}
                className="w-full border rounded p-2 text-sm mb-3 bg-white"
              />

              <div className="grid grid-cols-2 gap-2 mb-3">
                {q.options.map((opt, optIndex) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-400">{opt.id}.</span>
                    <input
                      type="text"
                      placeholder={`Option ${opt.id.toUpperCase()}`}
                      value={opt.text}
                      onChange={(e) => {
                        const copy = [...questions];
                        copy[qIndex].options[optIndex].text = e.target.value;
                        setQuestions(copy);
                      }}
                      className="w-full border rounded p-1.5 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 mr-2">Correct Option:</label>
                  <select
                    value={q.correctOption}
                    onChange={(e) => {
                      const copy = [...questions];
                      copy[qIndex].correctOption = e.target.value;
                      setQuestions(copy);
                    }}
                    className="border rounded p-1 uppercase"
                  >
                    <option value="a">A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                    <option value="d">D</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-50"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
          <button
            onClick={handleCreate}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
          >
            Publish Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
