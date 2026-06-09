import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ComposeForm } from "@/components/memos/ComposeForm";

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;

  return (
    <div className="max-w-3xl">
      <ComposeForm
        userId={session.user.id}
        userRole={session.user.role}
        departmentId={session.user.departmentId}
        departmentCode={session.user.departmentCode}
        draftId={params.draft}
      />
    </div>
  );
}
