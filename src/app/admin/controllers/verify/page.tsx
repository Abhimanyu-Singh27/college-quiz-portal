"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Check, X, Loader, Clock, User } from "lucide-react";

interface UnverifiedController {
  id: string;
  name: string;
  quiznexaId: string | null;
  createdAt: string;
  department?: string;
  _count?: {
    createdQuizzes: number;
  };
}

export default function VerifyControllersPage() {
  const router = useRouter();
  const [controllers, setControllers] = useState<UnverifiedController[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUnverifiedControllers();
  }, []);

  const fetchUnverifiedControllers = async () => {
    try {
      const response = await fetch("/api/admin/controllers/verify");
      if (!response.ok) throw new Error("Failed to fetch controllers");
      const data = await response.json();
      setControllers(data);
    } catch (err) {
      setError("Failed to load pending controllers");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (controllerId: string, approved: boolean) => {
    setProcessingId(controllerId);
    setError("");

    try {
      const response = await fetch("/api/admin/controllers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controllerId,
          approved,
          notes: notes[controllerId] || "",
        }),
      });

      if (!response.ok) throw new Error("Failed to process verification");

      // Remove from list
      setControllers(controllers.filter((c) => c.id !== controllerId));
      
      if (controllers.length === 1) {
        // Last controller, redirect back to dashboard
        setTimeout(() => router.push("/admin/dashboard"), 1500);
      }
    } catch (err) {
      setError("Failed to process verification");
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar user={null} />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar user={null} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Verify Controllers</h1>
          <p className="text-slate-600">
            Review and approve pending controller registrations
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        {/* Empty State */}
        {controllers.length === 0 && !isLoading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Clock className="w-16 h-16 text-emerald-500 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">All Caught Up!</h2>
            <p className="text-slate-600 mb-6">
              All controllers have been verified. No pending approvals.
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Controllers List */}
        <div className="space-y-4">
          {controllers.map((controller) => (
            <div
              key={controller.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition"
            >
              {/* Controller Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {controller.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{controller.name}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                        QuizNexa ID: {controller.quiznexaId || "Not assigned"}
                      </p>
                    </div>
                  </div>
                  {controller.department && (
                    <p className="text-sm text-slate-600 ml-12 flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {controller.department}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 ml-12 mt-1">
                    Registered {new Date(controller.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Notes Input */}
              <div className="mb-4">
                <textarea
                  placeholder="Add verification notes (optional)..."
                  value={notes[controller.id] || ""}
                  onChange={(e) =>
                    setNotes({ ...notes, [controller.id]: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleVerify(controller.id, true)}
                  disabled={processingId === controller.id}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingId === controller.id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => handleVerify(controller.id, false)}
                  disabled={processingId === controller.id}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingId === controller.id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900 text-sm">
            <strong>ℹ️ Note:</strong> Approved controllers will gain access to create and manage quizzes. 
            Rejected controllers will have their accounts permanently removed.
          </p>
        </div>
      </main>
    </div>
  );
}
