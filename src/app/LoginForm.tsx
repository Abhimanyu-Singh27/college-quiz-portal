"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, AlertCircle, Loader, Lock, Sparkles } from "lucide-react";

type LoginRole = "ADMIN" | "CONTROLLER";
type AdminAccessMode = "LOGIN" | "CREATE";

interface SessionAvailability {
  currentCount: number;
  maxLimit: number;
  isAvailable: boolean;
  message: string;
}

interface StaffAvailability {
  admin: SessionAvailability;
  controller: SessionAvailability;
  nextRole: LoginRole | null;
  allSlotsFull: boolean;
  adminConfigured: boolean;
  controllersConfigured: boolean;
  activeAdminName: string | null;
  assignedControllers: number;
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>("ADMIN");
    const [adminMode, setAdminMode] = useState<AdminAccessMode>("LOGIN");
  const [formData, setFormData] = useState({ name: "", quiznexaId: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<StaffAvailability | null>(null);

  useEffect(() => {
    const currentTabRole = sessionStorage.getItem("quiznexa_tab_role");
    if (currentTabRole === "ADMIN") {
      router.replace("/admin/dashboard");
      return;
    }
    if (currentTabRole === "CONTROLLER") {
      router.replace("/controller/dashboard");
      return;
    }

    const checkAvailability = async () => {
      setCheckingAvailability(true);
      try {
        const response = await fetch("/api/auth/check-availability?role=STAFF", { cache: "no-store" });
        const data = await response.json();
        if (response.ok) {
          setSessionInfo(data);
          setRole("ADMIN");
        }
      } catch (err) {
        console.error("Failed to check availability:", err);
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkAvailability();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!formData.quiznexaId && !(role === "ADMIN" && adminMode === "CREATE")) {
        setError("QuizNexa ID is required");
        return;
      }

      if ((role === "ADMIN" || role === "CONTROLLER") && !formData.password) {
        setError("Password is required");
        return;
      }

      // Check availability before submitting
      const selectedInfo = sessionInfo?.[role.toLowerCase() as "admin" | "controller"];
      if (selectedInfo && !selectedInfo.isAvailable) {
        setError(`No ${role.toLowerCase()} slots available. Please try again later.`);
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiznexaId: formData.quiznexaId,
          name: formData.name,
          password: formData.password,
          role,
                  createAccount: role === "ADMIN" && adminMode === "CREATE",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for verification pending status
        if (data.status === "PENDING_VERIFICATION") {
          setError(data.error || "Your account is pending verification");
          setFormData({ ...formData, password: "" }); // Clear password
          return;
        }
        // Check for session limit exceeded
        if (data.status === "SESSION_LIMIT_EXCEEDED") {
          setError(data.error || "Maximum sessions reached. Please try again later.");
          return;
        }
        setError(data.error || "Login failed");
        return;
      }

      sessionStorage.setItem("quiznexa_tab_role", role);
      router.push(data.redirectUrl);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoleInfo = sessionInfo?.[role.toLowerCase() as "admin" | "controller"];
  const adminIsActive = Boolean(sessionInfo?.admin.currentCount);
  const showRoleTabs = adminIsActive;
  const controllerTabAvailable = adminIsActive && Boolean(sessionInfo?.controllersConfigured);
  const controllerAssigned = Boolean(sessionInfo?.assignedControllers);
  const adminIsAvailable = true;
  const roleHasAccess = role === "ADMIN" || (controllerTabAvailable && controllerAssigned);
  const currentSlotsAvailable = role === "ADMIN"
    ? adminIsAvailable
    : Boolean(sessionInfo?.controller.isAvailable && controllerTabAvailable);

  return (
    <div className="min-h-screen bg-[#111514] flex items-center justify-center p-4 sm:p-8">
      <div className="relative w-full max-w-[440px]">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#e5a83b] rounded-2xl shadow-[0_8px_24px_rgba(229,168,59,0.2)]">
            <BookOpen className="w-6 h-6 text-[#111514]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#f7f4ed]">QuizNexa</h1>
            <p className="text-sm text-[#aeb7b0] mt-1">Assessment workspace</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#f7f4ed] border border-[#e7dfd1] rounded-[24px] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">

          {showRoleTabs && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-[#ebe7df] p-1">
              <button type="button" onClick={() => { setRole("ADMIN"); setError(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${role === "ADMIN" ? "bg-white text-[#19211e] shadow-sm" : "text-[#68736c]"}`}>Admin</button>
              {controllerTabAvailable && <button type="button" onClick={() => { setRole("CONTROLLER"); setError(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${role === "CONTROLLER" ? "bg-white text-[#19211e] shadow-sm" : "text-[#68736c]"}`}>Controller</button>}
            </div>
          )}

          {role === "ADMIN" && adminIsAvailable && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-[#ebe7df] p-1">
              <button type="button" onClick={() => { setAdminMode("LOGIN"); setError(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${adminMode === "LOGIN" ? "bg-white text-[#19211e] shadow-sm" : "text-[#68736c]"}`}>Sign in</button>
              <button type="button" onClick={() => { setAdminMode("CREATE"); setError(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${adminMode === "CREATE" ? "bg-white text-[#19211e] shadow-sm" : "text-[#68736c]"}`}>Create account</button>
            </div>
          )}

          <h2 className="text-2xl font-semibold tracking-tight text-[#19211e] mb-2">
            {role === "ADMIN" && adminMode === "CREATE" ? "Create administrator account" : role === "ADMIN" ? "Administrator access" : "Controller access"}
          </h2>
          <p className="text-[#68736c] text-sm mb-6">{adminMode === "CREATE" && role === "ADMIN" ? "Choose credentials for a new administrator." : "Enter your account details to continue."}</p>

          {role === "ADMIN" && sessionInfo && !sessionInfo.adminConfigured && (
            <div className="rounded-xl border border-[#b9d8c4] bg-[#edf7ef] p-3 mb-6 text-sm text-[#315d42]">
              Set up the first administrator account with your own details.
            </div>
          )}

          {role === "ADMIN" && sessionInfo && !sessionInfo.adminConfigured && (
            <div className="rounded-xl border border-[#b9d8c4] bg-[#edf7ef] p-3 mb-6 text-sm text-[#315d42]">Set up the first administrator account with your own details.</div>
          )}

          {/* Session Availability Info */}
          {role === "CONTROLLER" && currentRoleInfo && (
            <div
                className={`rounded-xl p-3 mb-6 flex items-start gap-3 ${
                currentSlotsAvailable
                  ? "bg-[#edf7ef] border border-[#b9d8c4]"
                  : "bg-[#fff0ed] border border-[#edc0b8]"
              }`}
            >
              {currentSlotsAvailable ? (
                <div className="text-sm">
                  <p className="text-[#315d42] font-medium">Access available</p>
                  <p className="text-[#527260] text-xs">
                    {currentRoleInfo.maxLimit - currentRoleInfo.currentCount} of{" "}
                    {currentRoleInfo.maxLimit} {role.toLowerCase()} slot(s) free
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3 w-full">
                  <Lock className="w-5 h-5 text-[#b45345] flex-shrink-0 mt-0.5" />
                  <div className="text-sm flex-1">
                    <p className="text-[#9d4035] font-medium">Access is currently full</p>
                    <p className="text-[#b45345] text-xs">
                      All {currentRoleInfo.maxLimit} {role.toLowerCase()} slot(s) are
                      currently in use. Please try again later.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#b45345]" />
              <p className="text-[#9d4035] text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          {!checkingAvailability && role === "ADMIN" && !currentSlotsAvailable ? (
            <div className="rounded-2xl border border-[#edc0b8] bg-[#fff0ed] p-6 text-center">
              <Lock className="mx-auto mb-3 h-9 w-9 text-[#b45345]" />
              <h3 className="text-xl font-semibold text-[#7d3028]">Administrator access is in use</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9d4035]">The current administrator must sign out before another administrator can sign in.</p>
            </div>
          ) : !checkingAvailability && role === "CONTROLLER" && !controllerAssigned ? (
            <div className="rounded-2xl border border-[#e5c98e] bg-[#fff8e8] p-6 text-center">
              <Lock className="mx-auto mb-3 h-9 w-9 text-[#b77917]" />
              <h3 className="text-xl font-semibold text-[#513b16]">No Controller has been assigned</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#795f2d]">{sessionInfo?.activeAdminName ? `${sessionInfo.activeAdminName} has not assigned a Controller yet. Please contact the administrator.` : "The administrator has not assigned a Controller yet. Please contact the administrator."}</p>
            </div>
          ) : !checkingAvailability && !roleHasAccess ? (
            <div className="rounded-2xl border border-[#e5c98e] bg-[#fff8e8] p-6 text-center">
              <Lock className="mx-auto mb-3 h-9 w-9 text-[#b77917]" />
              <h3 className="text-xl font-semibold text-[#513b16]">Controller access is not open yet</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#795f2d]">{sessionInfo?.activeAdminName ? `${sessionInfo.activeAdminName} has not opened Controller access yet. Please contact the administrator.` : "The administrator has not opened Controller access yet. Please contact the administrator."}</p>
            </div>
          ) : !checkingAvailability && role === "CONTROLLER" && !currentSlotsAvailable ? (
            <div className="rounded-2xl border border-[#e5c98e] bg-[#fff8e8] p-6 text-center">
              <Sparkles className="mx-auto mb-3 h-9 w-9 text-[#b77917]" />
              <h3 className="text-xl font-semibold text-[#513b16]">The room is at capacity</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#795f2d]">All staff access is currently in use. This page will be ready when a place opens.</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#8b6c2b]"><Lock className="h-4 w-4" /> Protected session</div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
                <label className="block text-sm font-medium text-[#455149] mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Prof. John Doe"
                className="w-full px-4 py-3 bg-white border border-[#d8d1c4] rounded-xl text-[#19211e] placeholder-[#9a9f99] focus:outline-none focus:ring-2 focus:ring-[#e5a83b] focus:border-transparent"
                disabled={!currentSlotsAvailable}
              />
            </div>

            {/* Email Field */}
            {!(role === "ADMIN" && adminMode === "CREATE") && <div>
              <label className="block text-sm font-medium text-[#455149] mb-2">QuizNexa ID</label>
              <input
                type="text"
                value={formData.quiznexaId}
                onChange={(e) => setFormData({ ...formData, quiznexaId: e.target.value.toUpperCase() })}
                placeholder="QN-ADM-1234ABCD"
                className="w-full px-4 py-3 bg-white border border-[#d8d1c4] rounded-xl text-[#19211e] placeholder-[#9a9f99] focus:outline-none focus:ring-2 focus:ring-[#e5a83b] focus:border-transparent"
                disabled={!currentSlotsAvailable}
              />
            </div>}

            {/* Password Field (for Admin/Controller) */}
            <>
              <div>
                <label className="block text-sm font-medium text-[#455149] mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-white border border-[#d8d1c4] rounded-xl text-[#19211e] placeholder-[#9a9f99] focus:outline-none focus:ring-2 focus:ring-[#e5a83b] focus:border-transparent"
                  disabled={!currentSlotsAvailable}
                />
              </div>
            </>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || checkingAvailability || !currentSlotsAvailable}
              className="w-full py-3 bg-[#19211e] text-[#f7f4ed] font-semibold rounded-xl hover:bg-[#2a3730] transition disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader className="w-5 h-5 animate-spin" />}
              {isLoading
                ? "Processing..."
                : checkingAvailability
                  ? "Checking..."
                  : !currentSlotsAvailable
                    ? "No Slots Available"
                    : "Sign In"}
            </button>
          </form>
          )}

        </div>
      </div>
    </div>
  );
}
