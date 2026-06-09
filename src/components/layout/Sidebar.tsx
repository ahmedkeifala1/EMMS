"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Inbox,
  Send,
  FilePen,
  Archive,
  Copy,
  PlusCircle,
  Users,
  Building2,
  ScrollText,
  LogOut,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  badge?: number;
}

interface SidebarProps {
  role: string;
  inboxCount?: number;
  ccCount?: number;
}

export function Sidebar({ role, inboxCount = 0, ccCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const nav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Inbox", href: "/inbox", icon: Inbox, badge: inboxCount },
    { label: "Compose", href: "/compose", icon: PlusCircle },
    { label: "Sent", href: "/sent", icon: Send },
    { label: "Drafts", href: "/drafts", icon: FilePen },
    {
      label: "CC Copies",
      href: "/cc-copies",
      icon: Copy,
      roles: ["head", "governor", "admin"],
      badge: ccCount,
    },
    { label: "Archive", href: "/archive", icon: Archive },
  ];

  const adminNav: NavItem[] = [
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Departments", href: "/admin/departments", icon: Building2 },
    { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
  ];

  const visibleNav = nav.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="flex h-full w-64 flex-col bg-[#003087] text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 font-bold text-sm">
          BSL
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">Bank of Sierra Leone</div>
          <div className="text-[10px] text-white/60 leading-tight">EMMS v1.0</div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-gray-900">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
              {active && <ChevronRight className="h-3 w-3 text-white/40" />}
            </Link>
          );
        })}

        {/* Admin section */}
        {role === "admin" && (
          <>
            <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Administration
            </div>
            {adminNav.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
