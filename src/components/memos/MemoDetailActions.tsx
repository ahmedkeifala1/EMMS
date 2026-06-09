"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Archive, ArchiveRestore, Loader2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  memoId: string;
  canAcknowledge: boolean;
  hasAcknowledged: boolean;
  isArchived: boolean;
  isSender: boolean;
}

export function MemoDetailActions({
  memoId,
  canAcknowledge,
  hasAcknowledged,
  isArchived,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function acknowledge() {
    setLoading("ack");
    await fetch(`/api/memos/${memoId}/acknowledge`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }

  async function toggleArchive() {
    setLoading("archive");
    await fetch(`/api/memos/${memoId}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: !isArchived }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {canAcknowledge && !hasAcknowledged && (
        <button
          onClick={acknowledge}
          disabled={loading === "ack"}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {loading === "ack" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Acknowledge
        </button>
      )}

      <button
        onClick={toggleArchive}
        disabled={loading === "archive"}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {loading === "archive" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isArchived ? (
          <ArchiveRestore className="h-4 w-4" />
        ) : (
          <Archive className="h-4 w-4" />
        )}
        {isArchived ? "Unarchive" : "Archive"}
      </button>
    </div>
  );
}
