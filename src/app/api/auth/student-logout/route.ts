import { NextResponse } from "next/server";
import { clearStudentSessionCookie, getStudentSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = await getStudentSessionToken();
  try {
    await clearStudentSessionCookie();
    if (token) {
      await prisma.activeSession.updateMany({ where: { sessionToken: token, logoutAt: null }, data: { logoutAt: new Date() } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Student logout error:", error);
    return NextResponse.json({ success: true });
  }
}