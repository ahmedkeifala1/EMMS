import { prisma } from "./prisma";

export async function logAction(params: {
  userId: string;
  memoId?: string;
  action: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        memoId: params.memoId,
        action: params.action,
        ipAddress: params.ipAddress,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      },
    });
  } catch {
    // audit log failure must not break the main flow
  }
}
