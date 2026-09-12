import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { avatarId } = body;

    if (!avatarId) {
      return NextResponse.json({ error: "Avatar ID required" }, { status: 400 });
    }

    // Verify avatar exists
    const avatar = await prisma.avatar.findUnique({ where: { id: avatarId } });
    if (!avatar) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    // Update user's avatar
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarId },
      include: { avatar: true },
    });

    return NextResponse.json({ success: true, avatar: user.avatar });
  } catch (error) {
    console.error("Select avatar error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
