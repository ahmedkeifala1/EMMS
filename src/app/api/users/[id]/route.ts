import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      staffId: true,
      role: true,
      mobile: true,
      isActive: true,
      createdAt: true,
      department: { select: { id: true, name: true, code: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.fullName) updateData.fullName = body.fullName;
  if (body.email) updateData.email = body.email;
  if (body.mobile !== undefined) updateData.mobile = body.mobile;
  if (body.role) updateData.role = body.role;
  if (body.departmentId) updateData.departmentId = body.departmentId;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.password) updateData.password = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  // Soft-delete: deactivate, never truly delete (audit requirement)
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
