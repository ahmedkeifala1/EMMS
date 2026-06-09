import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { generateMemoPdf } from "@/lib/pdf";
import { logAction } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const memo = await prisma.memo.findUnique({
    where: { id },
    include: {
      sender: { include: { department: true } },
      recipients: {
        include: {
          user: { include: { department: true } },
        },
      },
    },
  });

  if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isRecipient = memo.recipients.some((r) => r.userId === userId);
  const isSender = memo.senderId === userId;

  if (!isSender && !isRecipient && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (memo.isConfidential && session.user.role === "admin" && !isRecipient && !isSender) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body = memo.body;
  if (memo.isConfidential && body.startsWith("__ENCRYPTED__")) {
    try {
      body = decrypt(body.slice("__ENCRYPTED__".length), memo.referenceNumber);
    } catch {
      body = "[Encrypted — content not available]";
    }
  }

  const toRecipients = memo.recipients
    .filter((r) => r.receiptType === "to")
    .map((r) => ({
      name: r.user.fullName,
      department: r.user.department.name,
      type: r.receiptType,
    }));

  const ccList = memo.recipients
    .filter((r) => r.receiptType === "cc")
    .map((r) => ({ name: r.user.fullName, role: r.user.role }));

  const acknowledgements = memo.recipients
    .filter((r) => r.receiptType === "to")
    .map((r) => ({
      name: r.user.fullName,
      acknowledgedAt: r.acknowledgedAt,
      readAt: r.readAt,
    }));

  const pdfBuffer = await generateMemoPdf({
    referenceNumber: memo.referenceNumber,
    subject: memo.subject,
    body,
    priority: memo.priority,
    audienceType: memo.audienceType,
    isConfidential: memo.isConfidential,
    sentAt: memo.sentAt,
    createdAt: memo.createdAt,
    sender: memo.sender,
    recipients: toRecipients,
    ccList,
    acknowledgements,
  });

  await logAction({ userId, memoId: id, action: "export_pdf" });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${memo.referenceNumber.replace(/\//g, "-")}.pdf"`,
    },
  });
}
