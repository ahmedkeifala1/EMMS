import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;
  const body = await request.json();
  const archive = body.archive !== false;

  await prisma.memoRecipient.updateMany({
    where: { memoId: id, userId },
    data: { isArchived: archive },
  });

  await logAction({ userId, memoId: id, action: archive ? "archive" : "unarchive" });

  return NextResponse.json({ success: true });
}
