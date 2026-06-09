import { prisma } from "./prisma";
import type { ReceiptType } from "@/generated/prisma/client";

interface RoutingResult {
  toRecipients: string[];
  ccRecipients: Array<{ userId: string; type: ReceiptType }>;
}

/**
 * Resolves all recipients for a memo based on type and routing rules.
 * All memos automatically CC the sender's dept head and recipient's dept head.
 * Confidential memos use bcc_head for dept heads (not shown to recipient).
 */
export async function resolveRouting(params: {
  senderId: string;
  audienceType: "broadcast" | "individual" | "confidential";
  recipientIds: string[];
  departmentIds?: string[];
}): Promise<RoutingResult> {
  const { senderId, audienceType, recipientIds, departmentIds } = params;

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    include: { department: true },
  });
  if (!sender) throw new Error("Sender not found");

  const ccSet = new Map<string, ReceiptType>();
  const toRecipients: string[] = [];

  // ── Resolve primary recipients ─────────────────────────────────────────
  if (audienceType === "broadcast") {
    const deptIds = departmentIds?.length
      ? departmentIds
      : (await prisma.department.findMany({ select: { id: true } })).map(
          (d) => d.id
        );

    const staffInDepts = await prisma.user.findMany({
      where: { departmentId: { in: deptIds }, isActive: true },
      select: { id: true, role: true, departmentId: true },
    });

    staffInDepts.forEach((u) => {
      if (u.id !== senderId) toRecipients.push(u.id);
    });

    // All dept heads of receiving depts
    const depts = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { headUserId: true },
    });
    depts.forEach((d) => {
      if (d.headUserId && d.headUserId !== senderId) {
        ccSet.set(d.headUserId, "cc");
      }
    });
  } else {
    // individual / confidential
    recipientIds.forEach((id) => {
      if (id !== senderId) toRecipients.push(id);
    });
  }

  // ── Always CC sender's dept head ──────────────────────────────────────
  if (
    sender.department.headUserId &&
    sender.department.headUserId !== senderId &&
    !toRecipients.includes(sender.department.headUserId)
  ) {
    const headType: ReceiptType =
      audienceType === "confidential" ? "bcc_head" : "cc";
    ccSet.set(sender.department.headUserId, headType);
  }

  // ── CC recipient dept heads (for individual/confidential) ─────────────
  if (audienceType !== "broadcast" && recipientIds.length > 0) {
    const recipients = await prisma.user.findMany({
      where: { id: { in: recipientIds } },
      include: { department: true },
    });

    for (const recipient of recipients) {
      const headId = recipient.department.headUserId;
      if (
        headId &&
        headId !== senderId &&
        !toRecipients.includes(headId) &&
        headId !== recipient.id
      ) {
        const headType: ReceiptType =
          audienceType === "confidential" ? "bcc_head" : "cc";
        if (!ccSet.has(headId)) ccSet.set(headId, headType);
      }
    }
  }

  // ── If sender/recipient IS a dept head, escalate CC to their superior ──
  if (sender.role === "head" || sender.role === "governor") {
    const parentDept = await prisma.department.findUnique({
      where: { id: sender.departmentId },
      include: { parentDept: true },
    });
    if (parentDept?.parentDept?.headUserId) {
      const superiorId = parentDept.parentDept.headUserId;
      if (
        superiorId !== senderId &&
        !toRecipients.includes(superiorId)
      ) {
        const headType: ReceiptType =
          audienceType === "confidential" ? "bcc_head" : "cc";
        if (!ccSet.has(superiorId)) ccSet.set(superiorId, headType);
      }
    }
  }

  const ccRecipients = Array.from(ccSet.entries()).map(([userId, type]) => ({
    userId,
    type,
  }));

  return { toRecipients, ccRecipients };
}
