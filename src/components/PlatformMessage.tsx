"use client";

import { useEffect, useState } from "react";

type PlatformMessageProps = {
  message: string;
  tone?: "error" | "success" | "warning";
};

const toneClasses = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export function PlatformMessage({ message, tone = "error" }: PlatformMessageProps) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;

    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border p-3 text-sm ${toneClasses[tone]}`}>
      {message}
    </div>
  );
}
