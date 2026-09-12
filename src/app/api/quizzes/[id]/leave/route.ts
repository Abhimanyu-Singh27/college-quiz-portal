import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: quizId } = await params;
  const { visitId } = await request.json().catch(() => ({}));
  await prisma.quizVisit.updateMany({ where: { id: visitId, quizId, userId: session.userId, status: { in: ["JOINED", "ENTERED"] } }, data: { status: "LEFT_EARLY", leftAt: new Date() } });
  return NextResponse.json({ success: true });
}