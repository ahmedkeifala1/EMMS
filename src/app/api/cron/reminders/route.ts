import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called by a cron job (e.g., Vercel Cron / external scheduler).
// Secured with CRON_SECRET environment variable.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // All unacknowledged "to" recipients on high/urgent memos sent at least 24h ago
  const overdue = await prisma.memoRecipient.findMany({
    where: {
      receiptType: "to",
      acknowledgedAt: null,
      memo: {
        status: "sent",
        priority: { in: ["urgent", "high"] },
        sentAt: { lte: h24ago },
      },
    },
    include: {
      memo: {
        select: {
          id: true,
          subject: true,
          referenceNumber: true,
          sentAt: true,
          priority: true,
        },
      },
      user: {
        select: { id: true, email: true, fullName: true },
      },
    },
  });

  if (overdue.length === 0) {
    return NextResponse.json({ ok: true, reminded: 0, timestamp: now.toISOString() });
  }

  // Load all existing reminder audit entries for these memos in one query
  const memoIds = [...new Set(overdue.map((r) => r.memoId))];
  const existingReminders = await prisma.auditLog.findMany({
    where: {
      action: { in: ["reminder_24h", "reminder_48h"] },
      memoId: { in: memoIds },
    },
    select: { memoId: true, userId: true, action: true },
  });
  const sent = new Set(existingReminders.map((e) => `${e.memoId}:${e.userId}:${e.action}`));

  const toProcess: Array<{
    type: "reminder_24h" | "reminder_48h";
    recipientId: string;
    userId: string;
    memoId: string;
    userName: string;
    email: string;
    subject: string;
    referenceNumber: string;
    priority: string;
  }> = [];

  for (const r of overdue) {
    const sentAt = r.memo.sentAt!;
    const hoursElapsed = (now.getTime() - sentAt.getTime()) / (60 * 60 * 1000);

    // 24h reminder: due after 24h, not yet sent
    if (hoursElapsed >= 24 && !sent.has(`${r.memoId}:${r.userId}:reminder_24h`)) {
      toProcess.push({
        type: "reminder_24h",
        recipientId: r.id,
        userId: r.userId,
        memoId: r.memoId,
        userName: r.user.fullName,
        email: r.user.email,
        subject: r.memo.subject,
        referenceNumber: r.memo.referenceNumber,
        priority: r.memo.priority,
      });
    }

    // 48h reminder: due after 48h, not yet sent
    if (hoursElapsed >= 48 && !sent.has(`${r.memoId}:${r.userId}:reminder_48h`)) {
      toProcess.push({
        type: "reminder_48h",
        recipientId: r.id,
        userId: r.userId,
        memoId: r.memoId,
        userName: r.user.fullName,
        email: r.user.email,
        subject: r.memo.subject,
        referenceNumber: r.memo.referenceNumber,
        priority: r.memo.priority,
      });
    }
  }

  // Log each reminder as an audit entry (idempotent — re-runs won't double-send)
  await prisma.auditLog.createMany({
    data: toProcess.map((item) => ({
      userId: item.userId,
      memoId: item.memoId,
      action: item.type,
      metadata: {
        email: item.email,
        subject: item.subject,
        referenceNumber: item.referenceNumber,
        priority: item.priority,
      },
    })),
    skipDuplicates: true,
  });

  // TODO: wire up email delivery here (e.g., Nodemailer, SendGrid, Resend)
  // Each entry in toProcess has .email, .subject, .referenceNumber

  return NextResponse.json({
    ok: true,
    reminded: toProcess.length,
    details: toProcess.map(({ type, userName, email, subject, referenceNumber, priority }) => ({
      type,
      userName,
      email,
      subject,
      referenceNumber,
      priority,
    })),
    timestamp: now.toISOString(),
  });
}
