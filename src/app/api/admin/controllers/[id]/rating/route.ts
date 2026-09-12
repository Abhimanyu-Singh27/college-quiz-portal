import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id: controllerId } = await params;
  const { rating } = await request.json();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  const saved = await prisma.controllerRating.upsert({ where: { controllerId_ratedById: { controllerId, ratedById: session.userId } }, update: { rating }, create: { controllerId, ratedById: session.userId, rating } });
  return NextResponse.json(saved);
}