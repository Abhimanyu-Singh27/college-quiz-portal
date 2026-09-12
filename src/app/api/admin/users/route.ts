import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Role } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, quiznexaId: true, role: true, department: true },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  const formData = await req.formData();
  const targetUserId = formData.get("targetUserId") as string;
  const newRole = formData.get("newRole") as string;

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole as Role },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "ROLE_CHANGE",
      details: `Changed role of user ${updatedUser.quiznexaId || updatedUser.name} to ${newRole}`,
    },
  });

  return NextResponse.redirect(new URL("/admin", req.url));
}
