import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveRouting } from "@/lib/routing";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { audienceType, recipientIds = [], departmentIds = [] } = body;

  const routing = await resolveRouting({
    senderId: session.user.id,
    audienceType,
    recipientIds,
    departmentIds,
  });

  const [toUsers, ccUsers] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: routing.toRecipients } },
      select: { id: true, fullName: true, department: { select: { name: true } }, role: true },
    }),
    prisma.user.findMany({
      where: { id: { in: routing.ccRecipients.map((c) => c.userId) } },
      select: { id: true, fullName: true, department: { select: { name: true } }, role: true },
    }),
  ]);

  const ccWithType = ccUsers.map((u) => ({
    ...u,
    type: routing.ccRecipients.find((c) => c.userId === u.id)?.type || "cc",
  }));

  return NextResponse.json({ toUsers, ccUsers: ccWithType });
}
