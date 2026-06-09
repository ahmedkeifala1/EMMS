import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  staffId: z.string().min(2).max(20),
  password: z.string().min(8),
  departmentId: z.string().uuid(),
  role: z.enum(["staff", "head", "admin", "governor"]).default("staff"),
  mobile: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const deptId = url.searchParams.get("departmentId") || "";
  const excludeSelf = url.searchParams.get("excludeSelf") === "true";

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      AND: [
        search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { staffId: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        deptId ? { departmentId: deptId } : {},
        excludeSelf ? { id: { not: session.user.id } } : {},
      ],
    },
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
    orderBy: { fullName: "asc" },
    take: 50,
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const hashed = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: { ...data, password: hashed },
    select: {
      id: true,
      fullName: true,
      email: true,
      staffId: true,
      role: true,
      createdAt: true,
      department: { select: { id: true, name: true, code: true } },
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
