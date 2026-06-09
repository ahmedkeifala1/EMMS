import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MemoCard } from "@/components/memos/MemoCard";
import { MemoFilters } from "@/components/memos/MemoFilters";
import { Archive } from "lucide-react";

interface SearchParams { search?: string; priority?: string; dateFrom?: string; dateTo?: string; senderSearch?: string; }

export default async function ArchivePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;

  const andClauses: Prisma.MemoWhereInput[] = [];
  if (params.search) {
    andClauses.push({
      OR: [
        { subject: { contains: params.search, mode: "insensitive" } },
        { referenceNumber: { contains: params.search, mode: "insensitive" } },
        { sender: { fullName: { contains: params.search, mode: "insensitive" } } },
        { body: { contains: params.search, mode: "insensitive" } },
      ],
    });
  }
  if (params.senderSearch) {
    andClauses.push({ sender: { fullName: { contains: params.senderSearch, mode: "insensitive" } } });
  }
  if (params.dateFrom) andClauses.push({ sentAt: { gte: new Date(params.dateFrom) } });
  if (params.dateTo) {
    const to = new Date(params.dateTo); to.setHours(23, 59, 59, 999);
    andClauses.push({ sentAt: { lte: to } });
  }

  const memos = await prisma.memo.findMany({
    where: {
      AND: [
        {
          recipients: { some: { userId: session.user.id, isArchived: true } },
          ...(params.priority ? { priority: params.priority as never } : {}),
        },
        ...andClauses,
      ],
    },
    orderBy: { sentAt: "desc" },
    take: 50,
    include: {
      sender: { select: { fullName: true, department: { select: { name: true } } } },
      recipients: {
        where: { userId: session.user.id },
        select: { receiptType: true, acknowledgedAt: true, readAt: true },
      },
    },
  });

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Archive className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-bold text-gray-900">Archive</h2>
        <span className="ml-1 rounded-full bg-gray-500 px-2 py-0.5 text-xs font-bold text-white">{memos.length}</span>
      </div>
      <p className="text-xs text-gray-500">Archived memos are retained permanently per BSL records policy.</p>
      <Suspense><MemoFilters /></Suspense>
      {memos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Archive className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No archived memos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memos.map((m) => <MemoCard key={m.id} memo={m} viewAs="recipient" />)}
        </div>
      )}
    </div>
  );
}
