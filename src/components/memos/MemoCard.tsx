"use client";

import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import {
  AlertCircle,
  Lock,
  Radio,
  User,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface MemoCardProps {
  memo: {
    id: string;
    referenceNumber: string;
    subject: string;
    priority: string;
    audienceType: string;
    isConfidential: boolean;
    status: string;
    sentAt: Date | null;
    createdAt: Date;
    sender: { fullName: string; department: { name: string } };
    recipients?: Array<{
      receiptType: string;
      acknowledgedAt: Date | null;
      readAt: Date | null;
    }>;
  };
  viewAs?: "sender" | "recipient";
}

const audienceIcons: Record<string, React.ElementType> = {
  broadcast: Radio,
  individual: User,
  confidential: Lock,
};

export function MemoCard({ memo, viewAs = "recipient" }: MemoCardProps) {
  const myReceipt = memo.recipients?.[0];
  const isUnread = viewAs === "recipient" && !myReceipt?.readAt;
  const isAcknowledged = !!myReceipt?.acknowledgedAt;

  const AudienceIcon = audienceIcons[memo.audienceType] || User;

  return (
    <Link
      href={`/memos/${memo.id}`}
      className={cn(
        "memo-card flex items-start gap-4 rounded-xl border bg-white px-5 py-4 cursor-pointer",
        isUnread ? "border-[#003087]/30 bg-[#003087]/[0.02]" : "border-gray-200"
      )}
    >
      {/* Unread dot */}
      <div className="mt-1.5 flex-shrink-0">
        {isUnread ? (
          <div className="h-2.5 w-2.5 rounded-full bg-[#003087]" />
        ) : (
          <div className="h-2.5 w-2.5 rounded-full bg-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Priority badge */}
          {memo.priority !== "normal" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                memo.priority === "urgent"
                  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-700"
              )}
            >
              {memo.priority === "urgent" && <AlertCircle className="h-2.5 w-2.5" />}
              {memo.priority}
            </span>
          )}

          {/* Audience type */}
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
            <AudienceIcon className="h-2.5 w-2.5" />
            {memo.audienceType === "confidential" ? "Confidential" : memo.audienceType === "broadcast" ? "Broadcast" : "Individual"}
          </span>

          {/* Status */}
          {viewAs === "recipient" && (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 text-[10px] font-medium",
                isAcknowledged ? "text-green-600" : "text-amber-600"
              )}
            >
              {isAcknowledged ? (
                <><CheckCircle2 className="h-3 w-3" /> Acknowledged</>
              ) : (
                <><Clock className="h-3 w-3" /> Pending</>
              )}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-sm truncate", isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-800")}>
              {memo.isConfidential ? "[CONFIDENTIAL]" : memo.subject}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 truncate">
              {viewAs === "recipient"
                ? `From: ${memo.sender.fullName} · ${memo.sender.department.name}`
                : `Ref: ${memo.referenceNumber}`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-gray-400">
              {formatDate(memo.sentAt || memo.createdAt)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{memo.referenceNumber}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
