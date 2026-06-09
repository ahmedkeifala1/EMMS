import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    include: {
      head: { select: { id: true, fullName: true } },
      _count: { select: { users: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ departments });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const dept = await prisma.department.create({
    data: {
      name: body.name,
      code: body.code.toUpperCase(),
      headUserId: body.headUserId || null,
      parentDeptId: body.parentDeptId || null,
    },
  });

  return NextResponse.json({ department: dept }, { status: 201 });
}
