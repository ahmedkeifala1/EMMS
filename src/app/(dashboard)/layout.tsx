import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

async function getUnreadCounts(userId: string, role: string) {
  const [inbox, cc] = await Promise.all([
    prisma.memoRecipient.count({
      where: { userId, receiptType: "to", readAt: null, memo: { status: { not: "draft" } } },
    }),
    role === "head" || role === "governor" || role === "admin"
      ? prisma.memoRecipient.count({
          where: {
            userId,
            receiptType: { in: ["cc", "bcc_head"] },
            readAt: null,
          },
        })
      : Promise.resolve(0),
  ]);
  return { inbox, cc };
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { department: true },
  });

  if (!user) redirect("/login");

  const { inbox, cc } = await getUnreadCounts(user.id, user.role);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
      <Sidebar
        role={user.role}
        inboxCount={inbox}
        ccCount={cc}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title="BSL EMMS"
          userName={user.fullName}
          userRole={user.role}
          departmentName={user.department.name}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
