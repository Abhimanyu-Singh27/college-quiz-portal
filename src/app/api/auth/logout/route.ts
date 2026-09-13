import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const tokens = ["admin_session_token", "controller_session_token"]
      .map((name) => cookieStore.get(name)?.value)
      .filter((token): token is string => Boolean(token));

    for (const token of tokens) {
      const activeSession = await prisma.activeSession.findUnique({ where: { sessionToken: token }, select: { userId: true } });
      await prisma.activeSession.updateMany({
        where: activeSession ? { userId: activeSession.userId, logoutAt: null } : { sessionToken: token, logoutAt: null },
        data: { logoutAt: new Date() },
      });
    }
    cookieStore.delete("admin_session_token");
    cookieStore.delete("controller_session_token");
    cookieStore.delete("session_token");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: true, warning: "Session cleared locally" }, { status: 200 });
  }
}
