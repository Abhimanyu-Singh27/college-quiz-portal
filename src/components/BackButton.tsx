"use client";

import { useRouter } from "next/navigation";

export function BackButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();

  return <button type="button" onClick={() => router.back()} className={className}>{children}</button>;
}
