import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = await getSessionToken();
  try {
    // Clear the browser session first so logout still succeeds if the database is temporarily unavailable.
    await clearSessionCookie();
    if (token) {
      await prisma.activeSession.updateMany({
        where: { sessionToken: token, logoutAt: null },
        data: { logoutAt: new Date() },
      });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: true, warning: "Session cleared locally" }, { status: 200 });
  }
}
