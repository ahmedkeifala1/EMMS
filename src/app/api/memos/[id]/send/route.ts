import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { resolveRouting } from "@/lib/routing";
import { logAction } from "@/lib/audit";
import { sendEmail, buildMemoNotificationHtml } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;
  const body = await request.json();

  const memo = await prisma.memo.findUnique({
    where: { id },
    include: { sender: { include: { department: true } } },
  });

  if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (memo.senderId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (memo.status !== "draft")
    return NextResponse.json({ error: "Already sent" }, { status: 400 });

  // Apply any content updates from the request (editing before send)
  const newSubject = body.subject ?? memo.subject;
  const newPriority = body.priority ?? memo.priority;
  const newReferenceNote = body.referenceNote ?? memo.referenceNote;
  const newAudienceType = body.audienceType ?? memo.audienceType;
  const isConfidential = newAudienceType === "confidential";

  let memoBody = body.body ?? memo.body;
  if (isConfidential && !memoBody.startsWith("__ENCRYPTED__")) {
    memoBody = `__ENCRYPTED__${encrypt(memoBody, memo.referenceNumber)}`;
  }

  const updated = await prisma.memo.update({
    where: { id },
    data: {
      status: "sent",
      sentAt: new Date(),
      body: memoBody,
      subject: newSubject,
      priority: newPriority,
      referenceNote: newReferenceNote,
      audienceType: newAudienceType,
      isConfidential,
    },
  });

  // Resolve and create recipients
  const routing = await resolveRouting({
    senderId: userId,
    audienceType: newAudienceType,
    recipientIds: body.recipientIds || [],
    departmentIds: body.departmentIds || [],
  });

  const recipientRows = [
    ...routing.toRecipients.map((rId) => ({
      memoId: id,
      userId: rId,
      receiptType: "to" as const,
    })),
    ...routing.ccRecipients.map(({ userId: rId, type }) => ({
      memoId: id,
      userId: rId,
      receiptType: type,
    })),
  ];

  if (recipientRows.length > 0) {
    await prisma.memoRecipient.createMany({ data: recipientRows, skipDuplicates: true });
  }

  await logAction({ userId, memoId: id, action: "send" });

  // Notifications
  const allIds = recipientRows.map((r) => r.userId);
  if (allIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: allIds } },
      select: { email: true, fullName: true },
    });
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    users.forEach((u) => {
      sendEmail({
        to: u.email,
        subject: `[BSL-EMMS] New Memo: ${memo.isConfidential ? "[CONFIDENTIAL]" : memo.subject}`,
        html: buildMemoNotificationHtml({
          recipientName: u.fullName,
          senderName: memo.sender.fullName,
          subject: memo.subject,
          referenceNumber: memo.referenceNumber,
          priority: memo.priority,
          audienceType: memo.audienceType,
          appUrl,
        }),
      }).catch(() => {});
    });
  }

  return NextResponse.json({ memo: updated });
}
