import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const requestedRole = new URL(request.url).searchParams.get("role");
    const role = requestedRole === "CONTROLLER" ? "CONTROLLER" : "ADMIN";
    const cookieName = `${role.toLowerCase()}_session_token`;
    const token = cookieStore.get(cookieName)?.value;
    if (token) {
      const activeSession = await prisma.activeSession.findFirst({ where: { sessionToken: token, role, logoutAt: null }, select: { id: true, userId: true } });
      if (activeSession) {
        await prisma.activeSession.updateMany({ where: { userId: activeSession.userId, role, logoutAt: null }, data: { logoutAt: new Date() } });
      } else {
        await prisma.activeSession.updateMany({ where: { sessionToken: token, role, logoutAt: null }, data: { logoutAt: new Date() } });
      }
    }
    cookieStore.delete(cookieName);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: true, warning: "Session cleared locally" }, { status: 200 });
  }
}
