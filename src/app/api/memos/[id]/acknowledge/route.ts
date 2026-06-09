import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const recipient = await prisma.memoRecipient.findFirst({
    where: { memoId: id, userId, receiptType: "to" },
  });

  if (!recipient)
    return NextResponse.json({ error: "Not a recipient" }, { status: 403 });
  if (recipient.acknowledgedAt)
    return NextResponse.json({ error: "Already acknowledged" }, { status: 400 });

  await prisma.memoRecipient.update({
    where: { id: recipient.id },
    data: { acknowledgedAt: new Date() },
  });

  // Check if all recipients acknowledged → update memo status
  const [pending, total] = await Promise.all([
    prisma.memoRecipient.count({
      where: { memoId: id, receiptType: "to", acknowledgedAt: null },
    }),
    prisma.memoRecipient.count({ where: { memoId: id, receiptType: "to" } }),
  ]);

  if (pending === 0 && total > 0) {
    await prisma.memo.update({ where: { id }, data: { status: "acknowledged" } });
  }

  await logAction({ userId, memoId: id, action: "acknowledge" });

  return NextResponse.json({ success: true });
}
