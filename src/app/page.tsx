import { redirect } from "next/navigation";
import { filterVisibleProjects, getUserContext } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctx = await getUserContext();

  if (ctx.authEnabled && !ctx.isAuthenticated) {
    redirect("/login");
  }

  const visibleProjects = filterVisibleProjects(ctx);

  if (visibleProjects.length === 0) {
    return <NoAccess email={ctx.email} />;
  }

  redirect(`/projects/${visibleProjects[0].slug}`);
}

function NoAccess({ email }: { email: string | null }) {
  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-2xl border border-[#E5E5EA] bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-[#1C1C1E]">
            アクセス権がありません
          </h2>
          <p className="mt-2 text-sm text-[#8E8E93]">
            {email
              ? `${email} には案件への閲覧権限が付与されていません。`
              : "現在のアカウントには案件への閲覧権限が付与されていません。"}
          </p>
          <p className="mt-1 text-sm text-[#8E8E93]">
            管理者にお問い合わせください。
          </p>
        </div>
      </main>
    </div>
  );
}
