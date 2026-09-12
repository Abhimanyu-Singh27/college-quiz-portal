import "./globals.css";
import type { Metadata } from "next";
import { PullToRefresh } from "@/components/PullToRefresh";

export const metadata: Metadata = {
  title: "QuizNexa | Smart Assessment Workspace",
  description: "A secure, live quiz technology platform for colleges and teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 antialiased font-sans"><PullToRefresh />{children}</body>
    </html>
  );
}
