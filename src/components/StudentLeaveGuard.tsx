"use client";

import { useEffect, useRef } from "react";

interface StudentLeaveGuardProps {
  quizId: string;
  visitId?: string;
}

export function StudentLeaveGuard({ quizId, visitId }: StudentLeaveGuardProps) {
  const leaving = useRef(false);

  useEffect(() => {
    window.history.pushState({ quizNexaQuiz: true }, "", window.location.href);

    const leaveQuiz = async () => {
      if (leaving.current) return;
      leaving.current = true;
      try {
        await fetch(`/api/quizzes/${quizId}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitId }),
        });
        await fetch("/api/auth/student-logout", { method: "POST" });
      } finally {
        window.location.replace("/student/left");
      }
    };

    const handleBack = () => {
      void leaveQuiz();
    };

    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [quizId, visitId]);

  return null;
}
