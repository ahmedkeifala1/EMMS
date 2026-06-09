import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const dept = await prisma.department.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code?.toUpperCase(),
      headUserId: body.headUserId || null,
      parentDeptId: body.parentDeptId || null,
    },
  });

  return NextResponse.json({ department: dept });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
