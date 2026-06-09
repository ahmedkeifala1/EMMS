import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MemoCard } from "@/components/memos/MemoCard";
import { MemoFilters } from "@/components/memos/MemoFilters";
import { Send } from "lucide-react";

interface SearchParams { search?: string; priority?: string; audienceType?: string; dateFrom?: string; dateTo?: string; page?: string; }

export default async function SentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = 20;

  const andClauses: Prisma.MemoWhereInput[] = [];
  if (params.search) {
    andClauses.push({
      OR: [
        { subject: { contains: params.search, mode: "insensitive" } },
        { referenceNumber: { contains: params.search, mode: "insensitive" } },
        { body: { contains: params.search, mode: "insensitive" } },
      ],
    });
  }
  if (params.dateFrom) andClauses.push({ sentAt: { gte: new Date(params.dateFrom) } });
  if (params.dateTo) {
    const to = new Date(params.dateTo); to.setHours(23, 59, 59, 999);
    andClauses.push({ sentAt: { lte: to } });
  }

  const where: Prisma.MemoWhereInput = {
    AND: [
      {
        senderId: session.user.id,
        status: { not: "draft" },
        ...(params.priority ? { priority: params.priority as never } : {}),
        ...(params.audienceType ? { audienceType: params.audienceType as never } : {}),
      },
      ...andClauses,
    ],
  };

  const [memos, total] = await Promise.all([
    prisma.memo.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sender: { select: { fullName: true, department: { select: { name: true } } } },
        recipients: {
          where: { userId: session.user.id },
          select: { receiptType: true, acknowledgedAt: true, readAt: true },
        },
        _count: { select: { recipients: { where: { receiptType: "to", acknowledgedAt: { not: null } } } } },
      },
    }),
    prisma.memo.count({ where }),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Send className="h-5 w-5 text-green-600" />
        <h2 className="text-lg font-bold text-gray-900">Sent</h2>
        <span className="ml-1 rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">{total}</span>
      </div>
      <Suspense><MemoFilters /></Suspense>
      {memos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Send className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">No sent memos yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memos.map((memo) => <MemoCard key={memo.id} memo={memo} viewAs="sender" />)}
        </div>
      )}
    </div>
  );
}
