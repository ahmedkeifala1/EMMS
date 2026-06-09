import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  Inbox,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  PlusCircle,
  TrendingUp,
} from "lucide-react";

async function getDashboardStats(userId: string, role: string) {
  const [
    inboxTotal,
    inboxUnread,
    sentTotal,
    pendingAck,
    fullyAcked,
    recentSent,
    recentInbox,
  ] = await Promise.all([
    prisma.memoRecipient.count({
      where: { userId, receiptType: "to", memo: { status: { not: "draft" } } },
    }),
    prisma.memoRecipient.count({
      where: {
        userId,
        receiptType: "to",
        readAt: null,
        memo: { status: { not: "draft" } },
      },
    }),
    prisma.memo.count({ where: { senderId: userId, status: { not: "draft" } } }),
    prisma.memoRecipient.count({
      where: { userId, receiptType: "to", acknowledgedAt: null, memo: { status: "sent" } },
    }),
    prisma.memoRecipient.count({
      where: { userId, receiptType: "to", acknowledgedAt: { not: null } },
    }),
    prisma.memo.findMany({
      where: { senderId: userId, status: { not: "draft" } },
      orderBy: { sentAt: "desc" },
      take: 5,
      select: {
        id: true,
        referenceNumber: true,
        subject: true,
        priority: true,
        sentAt: true,
        audienceType: true,
        isConfidential: true,
        status: true,
        _count: { select: { recipients: { where: { receiptType: "to" } } } },
      },
    }),
    prisma.memoRecipient.findMany({
      where: {
        userId,
        receiptType: "to",
        memo: { status: { not: "draft" } },
      },
      orderBy: { memo: { sentAt: "desc" } },
      take: 5,
      include: {
        memo: {
          select: {
            id: true,
            referenceNumber: true,
            subject: true,
            priority: true,
            isConfidential: true,
            audienceType: true,
            sentAt: true,
            sender: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  return {
    inboxTotal,
    inboxUnread,
    sentTotal,
    pendingAck,
    fullyAcked,
    recentSent,
    recentInbox,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const stats = await getDashboardStats(session.user.id, session.user.role);

  const statCards = [
    {
      label: "Inbox",
      value: stats.inboxTotal,
      sub: `${stats.inboxUnread} unread`,
      icon: Inbox,
      color: "bg-blue-50 text-[#003087]",
      href: "/inbox",
    },
    {
      label: "Sent",
      value: stats.sentTotal,
      sub: "Total sent",
      icon: Send,
      color: "bg-green-50 text-green-700",
      href: "/sent",
    },
    {
      label: "Pending Acknowledgement",
      value: stats.pendingAck,
      sub: "Awaiting your action",
      icon: Clock,
      color: "bg-amber-50 text-amber-700",
      href: "/inbox",
    },
    {
      label: "Acknowledged",
      value: stats.fullyAcked,
      sub: "Confirmed by you",
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-700",
      href: "/inbox",
    },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back — here&apos;s your memo overview.
          </p>
        </div>
        <Link
          href="/compose"
          className="flex items-center gap-2 rounded-lg bg-[#003087] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002070] transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Compose Memo
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow"
            >
              <div className={`inline-flex rounded-lg p-2.5 ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="mt-0.5 text-sm font-medium text-gray-700">{card.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
            </Link>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inbox */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
              <Inbox className="h-4 w-4 text-[#003087]" />
              Recent Inbox
            </div>
            <Link href="/inbox" className="text-xs text-[#003087] hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentInbox.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No memos yet.</p>
            )}
            {stats.recentInbox.map(({ memo, readAt, acknowledgedAt }) => (
              <Link
                key={memo.id}
                href={`/memos/${memo.id}`}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    !readAt ? "bg-[#003087]" : "bg-gray-300"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {memo.isConfidential ? "[CONFIDENTIAL]" : memo.subject}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    From: {memo.sender.fullName} · {formatDate(memo.sentAt)}
                  </p>
                </div>
                {acknowledgedAt && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Sent */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Recently Sent
            </div>
            <Link href="/sent" className="text-xs text-[#003087] hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentSent.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No sent memos.</p>
            )}
            {stats.recentSent.map((memo) => (
              <Link
                key={memo.id}
                href={`/memos/${memo.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{memo.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {memo.referenceNumber} · {memo._count.recipients} recipient(s)
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {formatDate(memo.sentAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
