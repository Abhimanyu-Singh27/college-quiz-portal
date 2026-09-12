"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const pullThreshold = 44;

export function PullToRefresh() {
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (window.scrollY <= 1 && !refreshingRef.current) {
        startY.current = event.touches[0]?.clientY ?? null;
        pulling.current = true;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!pulling.current || startY.current === null || window.scrollY > 0) return;
      const difference = event.touches[0].clientY - startY.current;
      if (difference <= 0) {
        distanceRef.current = 0;
        setDistance(0);
        return;
      }
      event.preventDefault();
      const nextDistance = Math.min(difference * 0.55, pullThreshold + 24);
      distanceRef.current = nextDistance;
      setDistance(nextDistance);
    };

    const handleTouchEnd = () => {
      if (!pulling.current) return;
      const shouldRefresh = distanceRef.current >= pullThreshold;
      pulling.current = false;
      startY.current = null;
      distanceRef.current = 0;
      setDistance(0);
      if (shouldRefresh) {
        refreshingRef.current = true;
        setRefreshing(true);
        window.location.reload();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  if (!distance && !refreshing) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center" aria-live="polite">
      <div className="mt-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-lg">
        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        {refreshing ? "Refreshing..." : distance >= pullThreshold ? "Release to refresh" : "Pull to refresh"}
      </div>
    </div>
  );
}
