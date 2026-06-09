import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const ACTION_COLORS: Record<string, string> = {
  send: "bg-green-100 text-green-700",
  compose: "bg-blue-100 text-blue-700",
  read: "bg-gray-100 text-gray-600",
  acknowledge: "bg-emerald-100 text-emerald-700",
  archive: "bg-gray-100 text-gray-600",
  export_pdf: "bg-purple-100 text-purple-700",
  login: "bg-sky-100 text-sky-700",
  logout: "bg-slate-100 text-slate-600",
};

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/inbox");

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = 50;
  const skip = (page - 1) * limit;
  const action = params.action || "";

  const where = action ? { action } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { fullName: true, staffId: true } },
        memo: { select: { referenceNumber: true, subject: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  const actions = ["send", "compose", "read", "acknowledge", "archive", "export_pdf", "login", "logout"];

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-[#003087]" />
        <h2 className="text-lg font-bold text-gray-900">Audit Log</h2>
        <span className="rounded-full bg-[#003087] px-2 py-0.5 text-xs font-bold text-white">{total}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/audit-log" className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${!action ? "bg-[#003087] text-white border-[#003087]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
          All
        </Link>
        {actions.map((a) => (
          <Link key={a} href={`/admin/audit-log?action=${a}`} className={`rounded-lg px-3 py-1.5 text-xs font-medium border capitalize ${action === a ? "bg-[#003087] text-white border-[#003087]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
            {a.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Timestamp</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Memo</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{formatDate(log.createdAt)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{log.user.fullName}</p>
                  <p className="text-xs text-gray-400">{log.user.staffId}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                    {log.action.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {log.memo ? (
                    <Link href={`/memos/${log.memoId}`} className="text-xs text-[#003087] hover:underline font-mono">
                      {log.memo.referenceNumber}
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ipAddress || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {pages} · {total} entries</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`?page=${page - 1}&action=${action}`} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" /> Prev
              </Link>
            )}
            {page < pages && (
              <Link href={`?page=${page + 1}&action=${action}`} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
