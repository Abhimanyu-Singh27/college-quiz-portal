import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminControllerScope } from "@/lib/admin-scope";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { id: controllerId } = await params;
  const controller = await prisma.user.findFirst({ where: { ...adminControllerScope(session.userId), id: controllerId }, select: { id: true } });
  if (!controller) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
  const permissions = await prisma.controllerPermission.findMany({ where: { controllerId }, orderBy: { feature: "asc" } });
  return NextResponse.json(permissions);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const { id: controllerId } = await params;
    const controller = await prisma.user.findFirst({ where: { ...adminControllerScope(session.userId), id: controllerId }, select: { id: true } });
    if (!controller) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
    const { feature, quizId, granted } = await req.json();
    if (!feature) return NextResponse.json({ error: "feature is required" }, { status: 400 });
    const existing = await prisma.controllerPermission.findFirst({ where: { controllerId, quizId: quizId || null, feature } });
    const permission = existing
      ? await prisma.controllerPermission.update({ where: { id: existing.id }, data: { isGranted: Boolean(granted) } })
      : await prisma.controllerPermission.create({ data: { controllerId, quizId: quizId || null, feature, isGranted: granted !== false, grantedById: session.userId } });
    return NextResponse.json(permission);
  } catch (error) {
    console.error("Controller permission error:", error);
    return NextResponse.json({ error: "Unable to update controller permission" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const { id: controllerId } = await params;
    const controller = await prisma.user.findFirst({ where: { ...adminControllerScope(session.userId), id: controllerId }, select: { id: true } });
    if (!controller) return NextResponse.json({ error: "Controller not found" }, { status: 404 });
    const body = await req.json();
    if (!Array.isArray(body.permissions)) return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
    const result = await prisma.$transaction(async (tx) => {
      const saved = [];
      for (const item of body.permissions) {
        if (!item.feature) throw new Error("Invalid feature");
        const existing = await tx.controllerPermission.findFirst({ where: { controllerId, quizId: item.quizId || null, feature: item.feature } });
        saved.push(existing
          ? await tx.controllerPermission.update({ where: { id: existing.id }, data: { isGranted: Boolean(item.granted) } })
          : await tx.controllerPermission.create({ data: { controllerId, quizId: item.quizId || null, feature: item.feature, isGranted: Boolean(item.granted), grantedById: session.userId } }));
      }
      return saved;
    });
    return NextResponse.json({ success: true, permissions: result });
  } catch (error) {
    console.error("Controller permission bulk update error:", error);
    return NextResponse.json({ error: "Unable to save controller access settings" }, { status: 500 });
  }
}