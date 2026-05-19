import { redirect } from "next/navigation";
import { HeaderAuth } from "@/components/HeaderAuth";
import { ProjectCard } from "@/components/ProjectCard";
import {
  filterVisibleProjects,
  getUserContext,
  isAuthEnabled,
} from "@/lib/auth-helpers";
import { summarizeProject } from "@/lib/projectSummary";
import { fetchProjectTasks } from "@/lib/taskService";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctx = await getUserContext();

  if (ctx.authEnabled && !ctx.isAuthenticated) {
    redirect("/login");
  }

  const visibleProjects = filterVisibleProjects(ctx);
  const today = new Date();

  const summaries = await Promise.all(
    visibleProjects.map(async (project) => {
      const { tasks, source } = await fetchProjectTasks(project.slug);
      return {
        project,
        source,
        summary: summarizeProject(tasks, today),
      };
    }),
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <header className="border-b border-[#E5E5EA] bg-white/95 px-6 py-5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1E]">
              案件一覧
            </h1>
            <p className="mt-0.5 text-xs text-[#8E8E93]">
              進行中のプロジェクトを選択してください
            </p>
          </div>
          <HeaderAuth
            authEnabled={isAuthEnabled()}
            user={
              ctx.isAuthenticated && ctx.email
                ? { email: ctx.email, role: ctx.role }
                : null
            }
          />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {summaries.length === 0 ? (
          <NoAccess email={ctx.email} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {summaries.map(({ project, summary, source }) => (
              <ProjectCard
                key={project.slug}
                project={project}
                summary={summary}
                source={source}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function NoAccess({ email }: { email: string | null }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[#E5E5EA] bg-white p-8 text-center">
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
  );
}
