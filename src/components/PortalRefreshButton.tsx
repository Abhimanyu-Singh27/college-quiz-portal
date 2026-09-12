"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function PortalRefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={refreshing}
      aria-label="Refresh portal data"
      title="Refresh portal data"
      className="fixed right-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
    >
      <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
    </button>
  );
}
