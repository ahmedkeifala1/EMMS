import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { FilePen, PlusCircle, Trash2 } from "lucide-react";

export default async function DraftsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const drafts = await prisma.memo.findMany({
    where: { senderId: session.user.id, status: "draft" },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { fullName: true, department: { select: { name: true } } } },
      recipients: { select: { receiptType: true, acknowledgedAt: true, readAt: true } },
    },
  });

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilePen className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Drafts</h2>
          <span className="ml-1 rounded-full bg-gray-500 px-2 py-0.5 text-xs font-bold text-white">{drafts.length}</span>
        </div>
        <Link href="/compose" className="flex items-center gap-2 rounded-lg bg-[#003087] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#002070]">
          <PlusCircle className="h-4 w-4" /> New Memo
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FilePen className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No drafts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/compose?draft=${draft.id}`}
              className="flex items-center gap-4 rounded-xl border border-dashed border-gray-200 bg-white px-5 py-4 hover:border-[#003087]/30 hover:bg-[#003087]/[0.01] transition-colors"
            >
              <FilePen className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{draft.subject || "(No subject)"}</p>
                <p className="text-xs text-gray-500 mt-0.5">{draft.referenceNumber} · {draft.audienceType}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{formatDate(draft.createdAt)}</p>
                <span className="mt-0.5 inline-block text-[10px] font-bold uppercase text-amber-600">Draft</span>
              </div>
              <Trash2 className="h-4 w-4 text-gray-300 hover:text-red-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
