"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader, CheckCircle } from "lucide-react";

interface Avatar {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description?: string;
}

export default function AvatarSelectionPage() {
  const router = useRouter();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const response = await fetch("/api/avatars");
        if (!response.ok) throw new Error("Failed to load avatars");
        const data = await response.json();
        setAvatars(data);
      } catch (err) {
        setError("Failed to load avatars. Please try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvatars();
  }, []);

  const handleSelectAvatar = async (avatarId: string) => {
    setSelectedAvatar(avatarId);
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/avatars/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId }),
      });

      if (!response.ok) throw new Error("Failed to select avatar");

      // Wait for visual feedback
      setTimeout(() => {
        router.push("/student/quizzes");
      }, 1500);
    } catch (err) {
      setError("Failed to select avatar. Please try again.");
      setSelectedAvatar(null);
      setIsSaving(false);
      console.error(err);
    }
  };

  const handleSkip = () => {
    router.push("/student/quizzes");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading avatars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      {/* Animated background elements */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Choose Your Avatar! 👋
          </h1>
          <p className="text-purple-200 text-lg">
            Select a cool avatar to represent you during the quiz
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 mb-8 text-center">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Avatar Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          {avatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleSelectAvatar(avatar.id)}
              disabled={isSaving}
              className={`group relative p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                selectedAvatar === avatar.id
                  ? `ring-4 ring-green-400 ${avatar.color} shadow-2xl scale-105`
                  : `${avatar.color} hover:shadow-xl opacity-80 hover:opacity-100`
              } ${isSaving && selectedAvatar !== avatar.id ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: avatar.color + "30" }}
            >
              {/* Avatar Circle */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: avatar.color + "60" }}
              >
                {avatar.emoji}
              </div>

              {/* Avatar Name */}
              <h3 className="text-white font-bold text-center mb-1">{avatar.name}</h3>
              {avatar.description && (
                <p className="text-purple-100 text-xs text-center">{avatar.description}</p>
              )}

              {/* Selection Check */}
              {selectedAvatar === avatar.id && (
                <div className="absolute top-3 right-3">
                  {isSaving ? (
                    <Loader className="w-6 h-6 text-green-400 animate-spin" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleSkip}
            disabled={isSaving}
            className="px-8 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
          >
            Skip for Now
          </button>
          {selectedAvatar && (
            <button
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {isSaving ? "Selecting..." : "Continue"}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-12 text-center text-purple-200 text-sm">
          <p>✨ You can change your avatar anytime from your profile settings</p>
        </div>
      </div>
    </div>
  );
}
