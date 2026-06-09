import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { encrypt } from "@/lib/encryption";
import { logAction } from "@/lib/audit";
import { resolveRouting } from "@/lib/routing";
import { sendEmail, buildMemoNotificationHtml } from "@/lib/email";

async function generateReferenceNumber(departmentCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BSL/${departmentCode}/${year}/`;
  const last = await prisma.memo.findFirst({
    where: { referenceNumber: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
  });
  let seq = 1;
  if (last) {
    const parts = last.referenceNumber.split("/");
    seq = parseInt(parts[3] || "0", 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1),
  audienceType: z.enum(["broadcast", "individual", "confidential"]),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
  recipientIds: z.array(z.string()).default([]),
  departmentIds: z.array(z.string()).default([]),
  referenceNote: z.string().max(100).optional(),
  isDraft: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const view = url.searchParams.get("view") || "inbox";
  const search = url.searchParams.get("search") || "";
  const priority = url.searchParams.get("priority") || "";
  const status = url.searchParams.get("status") || "";
  const audienceType = url.searchParams.get("audienceType") || "";
  const archived = url.searchParams.get("archived") === "true";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const userId = session.user.id;
  const role = session.user.role;

  let where: Record<string, unknown> = {};

  if (view === "sent") {
    where = { senderId: userId, status: { not: "draft" } };
  } else if (view === "drafts") {
    where = { senderId: userId, status: "draft" };
  } else if (view === "cc") {
    where = {
      recipients: {
        some: {
          userId,
          receiptType: { in: ["cc", "bcc_head"] },
          isArchived: archived,
        },
      },
    };
  } else {
    // inbox
    where = {
      status: { not: "draft" },
      recipients: {
        some: {
          userId,
          receiptType: "to",
          isArchived: archived,
        },
      },
    };
  }

  // Admin can see all non-confidential
  if (role === "admin" && view === "all") {
    where = { isConfidential: false };
  }

  // Search filters
  const andClauses: unknown[] = [];
  if (search) {
    andClauses.push({
      OR: [
        { subject: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } },
        { sender: { fullName: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  if (priority) andClauses.push({ priority });
  if (status) andClauses.push({ status });
  if (audienceType) andClauses.push({ audienceType });

  if (andClauses.length > 0) {
    where = { AND: [where, ...andClauses] };
  }

  const [memos, total] = await Promise.all([
    prisma.memo.findMany({
      where: where as Prisma.MemoWhereInput,
      orderBy: { sentAt: "desc" },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, fullName: true, department: { select: { name: true } } } },
        recipients: {
          where: { userId },
          select: {
            receiptType: true,
            acknowledgedAt: true,
            readAt: true,
            isArchived: true,
          },
        },
        _count: { select: { recipients: { where: { receiptType: "to" } } } },
      },
    }),
    prisma.memo.count({ where: where as Prisma.MemoWhereInput }),
  ]);

  return NextResponse.json({ memos, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const senderId = session.user.id;

  // Get sender's department code for reference number
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    include: { department: true },
  });
  if (!sender) return NextResponse.json({ error: "Sender not found" }, { status: 404 });

  const referenceNumber = await generateReferenceNumber(sender.department.code);

  // Encrypt body if confidential
  const bodyToStore =
    data.audienceType === "confidential"
      ? `__ENCRYPTED__${encrypt(data.body, referenceNumber)}`
      : data.body;

  const isConfidential = data.audienceType === "confidential";

  // Create memo
  const memo = await prisma.memo.create({
    data: {
      referenceNumber,
      subject: data.subject,
      body: bodyToStore,
      senderId,
      audienceType: data.audienceType,
      priority: data.priority,
      status: data.isDraft ? "draft" : "sent",
      referenceNote: data.referenceNote,
      isConfidential,
      sentAt: data.isDraft ? null : new Date(),
    },
  });

  await logAction({
    userId: senderId,
    memoId: memo.id,
    action: data.isDraft ? "compose" : "send",
    ipAddress: request.headers.get("x-forwarded-for") || undefined,
  });

  if (!data.isDraft) {
    // Resolve routing
    const routing = await resolveRouting({
      senderId,
      audienceType: data.audienceType,
      recipientIds: data.recipientIds,
      departmentIds: data.departmentIds,
    });

    // Create recipient entries
    const recipientRows = [
      ...routing.toRecipients.map((userId) => ({
        memoId: memo.id,
        userId,
        receiptType: "to" as const,
      })),
      ...routing.ccRecipients.map(({ userId, type }) => ({
        memoId: memo.id,
        userId,
        receiptType: type,
      })),
    ];

    if (recipientRows.length > 0) {
      await prisma.memoRecipient.createMany({
        data: recipientRows,
        skipDuplicates: true,
      });
    }

    // Send email notifications (fire and forget)
    const allRecipientIds = recipientRows.map((r) => r.userId);
    if (allRecipientIds.length > 0) {
      const recipientUsers = await prisma.user.findMany({
        where: { id: { in: allRecipientIds } },
        select: { email: true, fullName: true },
      });
      const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      recipientUsers.forEach((u) => {
        sendEmail({
          to: u.email,
          subject: `[BSL-EMMS] New Memo: ${isConfidential ? "[CONFIDENTIAL]" : data.subject}`,
          html: buildMemoNotificationHtml({
            recipientName: u.fullName,
            senderName: sender.fullName,
            subject: data.subject,
            referenceNumber,
            priority: data.priority,
            audienceType: data.audienceType,
            appUrl,
          }),
        }).catch(() => {});
      });
    }
  }

  return NextResponse.json({ memo }, { status: 201 });
}
