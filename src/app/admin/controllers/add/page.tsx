"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

export default function AddControllerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    quiznexaId: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.quiznexaId.trim()) {
      newErrors.quiznexaId = "QuizNexa ID is required";
    } else if (!/^QN-[A-Z0-9-]+$/i.test(formData.quiznexaId.trim())) {
      newErrors.quiznexaId = "Use a valid QuizNexa ID";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/admin/controllers/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          quiznexaId: formData.quiznexaId.trim().toUpperCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ submit: data.error || "Failed to create controller" });
        return;
      }

      setSuccessMessage("Controller created successfully!");
      router.back();
    } catch (error) {
      setErrors({ submit: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Link href="/admin/controllers" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Controllers
        </Link>

        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-8">
            <h1 className="text-2xl font-bold text-white mb-2">Create New Controller</h1>
            <p className="text-amber-50">Assign a controller to manage quizzes and monitor exams</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-800">{successMessage}</p>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800">{errors.submit}</p>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Controller Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Prof. John Doe"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.name
                    ? "border-red-300 focus:ring-red-500"
                    : "border-slate-300 focus:ring-amber-500"
                }`}
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* QuizNexa ID Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">QuizNexa ID</label>
              <input
                type="text"
                value={formData.quiznexaId}
                onChange={(e) => setFormData({ ...formData, quiznexaId: e.target.value.toUpperCase() })}
                placeholder="QN-CTL-1234ABCD"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.quiznexaId
                    ? "border-red-300 focus:ring-red-500"
                    : "border-slate-300 focus:ring-amber-500"
                }`}
              />
              {errors.quiznexaId && <p className="text-red-600 text-xs mt-1">{errors.quiznexaId}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.password
                      ? "border-red-300 focus:ring-red-500"
                      : "border-slate-300 focus:ring-amber-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm password"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.confirmPassword
                    ? "border-red-300 focus:ring-red-500"
                    : "border-slate-300 focus:ring-amber-500"
                }`}
              />
              {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-white py-2 rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? "Creating..." : "Create Controller"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
