import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/admin/UserManagement";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/inbox");

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      include: { department: { select: { id: true, name: true, code: true } } },
      orderBy: [{ department: { name: "asc" } }, { fullName: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <UserManagement
      initialUsers={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        password: undefined as unknown as string,
      }))}
      departments={departments}
    />
  );
}
