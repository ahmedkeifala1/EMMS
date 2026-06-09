"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function MemoFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showMore, setShowMore] = useState(
    !!(searchParams.get("dateFrom") || searchParams.get("dateTo") || searchParams.get("senderSearch"))
  );

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const hasActiveFilters = !!(
    searchParams.get("search") ||
    searchParams.get("priority") ||
    searchParams.get("audienceType") ||
    searchParams.get("dateFrom") ||
    searchParams.get("dateTo") ||
    searchParams.get("senderSearch")
  );

  return (
    <div className="space-y-2 mb-4">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by subject, sender, reference…"
            defaultValue={searchParams.get("search") || ""}
            onChange={(e) => update("search", e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10"
          />
        </div>

        {/* Priority filter */}
        <select
          aria-label="Filter by priority"
          value={searchParams.get("priority") || ""}
          onChange={(e) => update("priority", e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#003087]"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
        </select>

        {/* Type filter */}
        <select
          aria-label="Filter by memo type"
          value={searchParams.get("audienceType") || ""}
          onChange={(e) => update("audienceType", e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#003087]"
        >
          <option value="">All Types</option>
          <option value="broadcast">Broadcast</option>
          <option value="individual">Individual</option>
          <option value="confidential">Confidential</option>
        </select>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
            showMore
              ? "border-[#003087] bg-[#003087]/5 text-[#003087]"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          )}
        >
          <Filter className="h-4 w-4" />
          More Filters
          <ChevronDown className={cn("h-3 w-3 transition-transform", showMore && "rotate-180")} />
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Expanded more filters */}
      {showMore && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Date from</label>
            <input
              type="date"
              aria-label="Date from"
              title="Filter from date"
              value={searchParams.get("dateFrom") || ""}
              onChange={(e) => update("dateFrom", e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#003087]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Date to</label>
            <input
              type="date"
              aria-label="Date to"
              title="Filter to date"
              value={searchParams.get("dateTo") || ""}
              onChange={(e) => update("dateTo", e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#003087]"
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Sender</label>
            <input
              type="text"
              placeholder="Filter by sender name…"
              defaultValue={searchParams.get("senderSearch") || ""}
              onChange={(e) => update("senderSearch", e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#003087]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
