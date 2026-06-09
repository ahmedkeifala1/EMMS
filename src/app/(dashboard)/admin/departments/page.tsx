import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DepartmentManagement } from "@/components/admin/DepartmentManagement";

export default async function AdminDepartmentsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/inbox");

  const [departments, users] = await Promise.all([
    prisma.department.findMany({
      include: {
        head: { select: { id: true, fullName: true, role: true } },
        _count: { select: { users: { where: { isActive: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ["head", "governor"] } },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return <DepartmentManagement initialDepts={departments} eligibleHeads={users} />;
}
