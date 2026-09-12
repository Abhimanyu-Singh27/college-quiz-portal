import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const avatars = await prisma.avatar.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(avatars);
  } catch (error) {
    console.error("Fetch avatars error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, emoji, color, description } = body;

    if (!name || !emoji || !color) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const avatar = await prisma.avatar.create({
      data: { name, emoji, color, description },
    });

    return NextResponse.json(avatar, { status: 201 });
  } catch (error) {
    console.error("Create avatar error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
