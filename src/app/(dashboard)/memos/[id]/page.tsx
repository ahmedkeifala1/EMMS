import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { decrypt } from "@/lib/encryption";
import { formatDate } from "@/lib/utils";
import { MemoDetailActions } from "@/components/memos/MemoDetailActions";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  User,
  Building2,
  Lock,
  Radio,
  AlertCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export default async function MemoDetailPage({ params }: Params) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const userId = session.user.id;
  const role = session.user.role;

  const memo = await prisma.memo.findUnique({
    where: { id },
    include: {
      sender: {
        include: { department: true },
      },
      recipients: {
        include: {
          user: { include: { department: true } },
        },
        orderBy: { receiptType: "asc" },
      },
    },
  });

  if (!memo) notFound();

  const isRecipient = memo.recipients.some((r) => r.userId === userId);
  const isSender = memo.senderId === userId;

  if (!isSender && !isRecipient && role !== "admin") {
    redirect("/inbox");
  }

  if (memo.isConfidential && role === "admin" && !isRecipient && !isSender) {
    redirect("/inbox");
  }

  // Decrypt body
  let body = memo.body;
  if (memo.isConfidential && body.startsWith("__ENCRYPTED__")) {
    try {
      body = decrypt(body.slice("__ENCRYPTED__".length), memo.referenceNumber);
    } catch {
      body = "[Content is encrypted and could not be decrypted.]";
    }
  }

  // Mark as read (server-side)
  const myReceipt = memo.recipients.find((r) => r.userId === userId);
  if (myReceipt && !myReceipt.readAt) {
    await prisma.memoRecipient.update({
      where: { id: myReceipt.id },
      data: { readAt: new Date() },
    });
  }

  const toRecipients = memo.recipients.filter((r) => r.receiptType === "to");
  const ccRecipients = memo.recipients.filter((r) => r.receiptType === "cc");
  const bccHeads = memo.recipients.filter((r) => r.receiptType === "bcc_head");

  const canAcknowledge = isRecipient && myReceipt?.receiptType === "to" && !myReceipt?.acknowledgedAt;
  const hasAcknowledged = !!myReceipt?.acknowledgedAt;

  const priorityColors = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    normal: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <div className="max-w-4xl space-y-5">
      {/* Back + actions header */}
      <div className="flex items-center justify-between">
        <Link
          href="/inbox"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#003087]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`/api/memos/${id}/pdf`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </a>
          <MemoDetailActions
            memoId={id}
            canAcknowledge={canAcknowledge}
            hasAcknowledged={hasAcknowledged}
            isArchived={myReceipt?.isArchived || false}
            isSender={isSender}
          />
        </div>
      </div>

      {/* Main memo card */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Confidential banner */}
        {memo.isConfidential && (
          <div className="flex items-center gap-2 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white">
            <Lock className="h-4 w-4" />
            STRICTLY CONFIDENTIAL — Restricted to authorised parties only
          </div>
        )}

        {/* Header */}
        <div className="border-b border-gray-100 bg-[#003087] px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/60 mb-1">
                {memo.referenceNumber}
                {memo.referenceNote && ` · Ref: ${memo.referenceNote}`}
              </p>
              <h1 className="text-lg font-bold">
                {memo.isConfidential ? "[CONFIDENTIAL MEMO]" : memo.subject}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {memo.priority !== "normal" && (
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-bold uppercase border",
                    memo.priority === "urgent"
                      ? "bg-red-100 text-red-700 border-red-300"
                      : "bg-orange-100 text-orange-700 border-orange-300"
                  )}
                >
                  {memo.priority === "urgent" && <AlertCircle className="inline h-3 w-3 mr-0.5" />}
                  {memo.priority}
                </span>
              )}
              <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-medium capitalize">
                {memo.audienceType === "broadcast" ? (
                  <><Radio className="inline h-3 w-3 mr-0.5" />Broadcast</>
                ) : memo.audienceType === "confidential" ? (
                  <><Lock className="inline h-3 w-3 mr-0.5" />Confidential</>
                ) : (
                  <><User className="inline h-3 w-3 mr-0.5" />Individual</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 px-6 py-4 bg-gray-50 text-sm">
          <div>
            <span className="font-semibold text-gray-600">From:</span>{" "}
            <span className="text-gray-900">{memo.sender.fullName}</span>
            <span className="text-gray-400"> · {memo.sender.department.name}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Date:</span>{" "}
            <span className="text-gray-900">{formatDate(memo.sentAt || memo.createdAt)}</span>
          </div>
          <div className="col-span-2">
            <span className="font-semibold text-gray-600">To:</span>{" "}
            <span className="text-gray-900">
              {toRecipients.length === 0
                ? "All Staff"
                : toRecipients.map((r) => r.user.fullName).join(", ")}
            </span>
          </div>
          {ccRecipients.length > 0 && (
            <div className="col-span-2">
              <span className="font-semibold text-gray-600">CC:</span>{" "}
              <span className="text-gray-700">
                {ccRecipients.map((r) => `${r.user.fullName} (${r.user.department.name})`).join(", ")}
              </span>
            </div>
          )}
          {bccHeads.length > 0 && (isSender || role === "admin") && (
            <div className="col-span-2">
              <span className="font-semibold text-gray-600">BCC Heads:</span>{" "}
              <span className="text-gray-400 text-xs italic">
                {bccHeads.map((r) => r.user.fullName).join(", ")} (silent)
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
            {body}
          </div>
        </div>

        {/* Acknowledgement status for current user */}
        {isRecipient && myReceipt?.receiptType === "to" && (
          <div className={cn(
            "mx-6 mb-6 flex items-center justify-between rounded-lg border px-4 py-3",
            hasAcknowledged
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          )}>
            <div className="flex items-center gap-2 text-sm">
              {hasAcknowledged ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">You acknowledged this memo</span>
                  <span className="text-green-500">{formatDate(myReceipt.acknowledgedAt)}</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-700">Acknowledgement required</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Acknowledgement tracking (for sender / dept heads) */}
      {(isSender || role === "head" || role === "governor" || role === "admin") && toRecipients.length > 0 && (() => {
        const ackCount = toRecipients.filter((r) => r.acknowledgedAt).length;

        if (memo.audienceType === "broadcast" && (role === "head" || role === "governor" || role === "admin")) {
          // Group by department for broadcast memos
          const deptMap = new Map<string, { name: string; total: number; acked: number }>();
          for (const r of toRecipients) {
            const deptName = r.user.department.name;
            const existing = deptMap.get(deptName) ?? { name: deptName, total: 0, acked: 0 };
            existing.total += 1;
            if (r.acknowledgedAt) existing.acked += 1;
            deptMap.set(deptName, existing);
          }
          const depts = Array.from(deptMap.values()).sort((a, b) => a.name.localeCompare(b.name));

          return (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-500" />
                  Acknowledgement by Department
                </h3>
                <span className="text-xs text-gray-500">
                  {ackCount}/{toRecipients.length} overall
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {depts.map((dept) => {
                  const pct = dept.total === 0 ? 0 : Math.round((dept.acked / dept.total) * 100);
                  return (
                    <div key={dept.name} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                        </div>
                        <span className={cn(
                          "text-xs font-semibold",
                          pct === 100 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500"
                        )}>
                          {dept.acked}/{dept.total} · {pct}%
                        </span>
                      </div>
                      <progress
                        value={dept.acked}
                        max={dept.total}
                        aria-label={`${dept.name}: ${dept.acked} of ${dept.total} acknowledged`}
                        className={cn(
                          "w-full h-1.5 rounded-full appearance-none",
                          "[&::-webkit-progress-bar]:bg-gray-100 [&::-webkit-progress-bar]:rounded-full",
                          "[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all",
                          pct === 100
                            ? "[&::-webkit-progress-value]:bg-green-500 [&::-moz-progress-bar]:bg-green-500"
                            : pct >= 50
                            ? "[&::-webkit-progress-value]:bg-amber-400 [&::-moz-progress-bar]:bg-amber-400"
                            : "[&::-webkit-progress-value]:bg-red-400 [&::-moz-progress-bar]:bg-red-400"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // Individual / confidential: show per-recipient list
        return (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-500" />
                Acknowledgement Status
              </h3>
              <span className="text-xs text-gray-500">
                {ackCount}/{toRecipients.length} acknowledged
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {toRecipients.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 shrink-0">
                    {r.user.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.user.fullName}</p>
                    <p className="text-xs text-gray-500">{r.user.department.name}</p>
                  </div>
                  <div className="text-right">
                    {r.acknowledgedAt ? (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {formatDate(r.acknowledgedAt)}
                      </div>
                    ) : r.readAt ? (
                      <div className="flex items-center gap-1 text-amber-600 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        Read · Not acknowledged
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Clock className="h-3.5 w-3.5" />
                        Not read
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
