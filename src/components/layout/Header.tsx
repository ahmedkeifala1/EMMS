"use client";

import { useState } from "react";
import { Bell, Search, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  userName: string;
  userRole: string;
  departmentName?: string;
}

const roleLabels: Record<string, string> = {
  staff: "Staff",
  head: "Departmental Head",
  admin: "System Administrator",
  governor: "Governor / Deputy Governor",
};

export function Header({ title, userName, userRole, departmentName }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-6">
      <button className="lg:hidden p-1 rounded text-gray-500 hover:bg-gray-100">
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="flex-1 text-base font-semibold text-gray-900">{title}</h1>

      <div className={cn(
        "items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 transition-all",
        searchOpen ? "flex w-64" : "hidden sm:flex w-48"
      )}>
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          type="text"
          placeholder="Search memos…"
          className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setSearchOpen(false)}
        />
      </div>

      <button className="sm:hidden p-1 rounded text-gray-500 hover:bg-gray-100">
        <Search className="h-5 w-5" />
      </button>

      <button className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
        <Bell className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#003087] text-white text-xs font-bold">
          {userName.split(" ").map(n => n[0]).slice(0, 2).join("")}
        </div>
        <div className="hidden md:block">
          <div className="text-sm font-medium text-gray-900 leading-tight">{userName}</div>
          <div className="text-[11px] text-gray-500 leading-tight">
            {roleLabels[userRole] || userRole}
            {departmentName && ` · ${departmentName}`}
          </div>
        </div>
      </div>
    </header>
  );
}
