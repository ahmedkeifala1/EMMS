import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { logAction } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;
  const role = session.user.role;

  const memo = await prisma.memo.findUnique({
    where: { id },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          staffId: true,
          department: { select: { id: true, name: true, code: true } },
        },
      },
      recipients: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              role: true,
              department: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access control
  const isRecipient = memo.recipients.some((r) => r.userId === userId);
  const isSender = memo.senderId === userId;

  if (!isSender && !isRecipient && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Admin cannot access confidential memos
  if (memo.isConfidential && role === "admin" && !isRecipient && !isSender) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Decrypt body if confidential
  let body = memo.body;
  if (memo.isConfidential && body.startsWith("__ENCRYPTED__")) {
    try {
      body = decrypt(body.slice("__ENCRYPTED__".length), memo.referenceNumber);
    } catch {
      body = "[Decryption error]";
    }
  }

  // Mark as read
  if (isRecipient) {
    await prisma.memoRecipient.updateMany({
      where: { memoId: id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    await logAction({
      userId,
      memoId: id,
      action: "read",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });
  }

  return NextResponse.json({ ...memo, body });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const userId = session.user.id;

  const memo = await prisma.memo.findUnique({ where: { id } });
  if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (memo.senderId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (memo.status !== "draft")
    return NextResponse.json({ error: "Only drafts can be edited" }, { status: 400 });

  const updated = await prisma.memo.update({
    where: { id },
    data: {
      subject: body.subject,
      body: body.body,
      priority: body.priority,
      referenceNote: body.referenceNote,
      ...(body.audienceType && { audienceType: body.audienceType, isConfidential: body.audienceType === "confidential" }),
    },
  });

  return NextResponse.json({ memo: updated });
}
