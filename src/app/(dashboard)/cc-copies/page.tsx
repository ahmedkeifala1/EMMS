import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MemoCard } from "@/components/memos/MemoCard";
import { MemoFilters } from "@/components/memos/MemoFilters";
import { Copy } from "lucide-react";

export default async function CcCopiesPage({ searchParams }: { searchParams: Promise<{ search?: string; priority?: string; dateFrom?: string; dateTo?: string; senderSearch?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role !== "head" && role !== "governor" && role !== "admin") {
    redirect("/inbox");
  }

  const params = await searchParams;

  const andClauses = [];
  if (params.search) {
    andClauses.push({
      OR: [
        { subject: { contains: params.search, mode: "insensitive" as const } },
        { referenceNumber: { contains: params.search, mode: "insensitive" as const } },
        { sender: { fullName: { contains: params.search, mode: "insensitive" as const } } },
      ],
    });
  }
  if (params.senderSearch) {
    andClauses.push({ sender: { fullName: { contains: params.senderSearch, mode: "insensitive" as const } } });
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
          recipients: { some: { userId: session.user.id, receiptType: { in: ["cc", "bcc_head"] } } },
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
        <Copy className="h-5 w-5 text-purple-600" />
        <h2 className="text-lg font-bold text-gray-900">CC Copies</h2>
        <span className="ml-1 rounded-full bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">{memos.length}</span>
      </div>
      <p className="text-sm text-gray-500">
        Memos routed through your department for your awareness. You are copied as Departmental Head.
      </p>
      <Suspense><MemoFilters /></Suspense>
      {memos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Copy className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No CC memos yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memos.map((memo) => (
            <MemoCard key={memo.id} memo={memo} viewAs="recipient" />
          ))}
        </div>
      )}
    </div>
  );
}
