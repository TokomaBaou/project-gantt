import { ProjectCard } from "@/components/ProjectCard";
import { PROJECTS } from "@/data/projects";
import { summarizeProject } from "@/lib/projectSummary";
import { fetchProjectTasks } from "@/lib/taskService";

export const dynamic = "force-dynamic";

export default async function Home() {
  const today = new Date();

  const summaries = await Promise.all(
    PROJECTS.map(async (project) => {
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
        <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1E]">
          案件一覧
        </h1>
        <p className="mt-0.5 text-xs text-[#8E8E93]">
          進行中のプロジェクトを選択してください
        </p>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
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
      </main>
    </div>
  );
}
