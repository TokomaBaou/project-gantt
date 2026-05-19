import Link from "next/link";
import { formatDate, type ProjectSummary } from "@/lib/projectSummary";
import type { TaskSource } from "@/lib/taskService";
import type { ProjectMeta } from "@/types/wbs";

interface ProjectCardProps {
  project: ProjectMeta;
  summary: ProjectSummary;
  source: TaskSource;
}

export function ProjectCard({ project, summary, source }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block rounded-2xl border border-[#E5E5EA] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#1C1C1E] group-hover:text-[#007AFF]">
            {project.name}
          </h2>
          <p className="mt-1 text-sm text-[#8E8E93]">{project.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-[#F2F2F7] px-2 py-0.5 text-xs font-medium text-[#8E8E93]">
            {project.slug}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              source === "notion"
                ? "bg-[#E8F9ED] text-[#28A745]"
                : "bg-[#FFF3E0] text-[#E65100]"
            }`}
          >
            {source === "notion" ? "Notion" : "ローカル"}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-[#8E8E93]">
          <span>進捗</span>
          <span className="font-medium text-[#1C1C1E]">
            {summary.progress}% ({summary.doneTasks}/{summary.totalTasks})
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F2F2F7]">
          <div
            className="h-full rounded-full bg-[#007AFF] transition-all"
            style={{ width: `${summary.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="text-xs font-medium uppercase tracking-wide text-[#8E8E93]">
          Phase
        </div>
        <ul className="space-y-0.5 text-sm text-[#1C1C1E]">
          {project.phases.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C7C7CC]" />
              {p.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-[#E5E5EA] pt-3">
        <div className="text-xs font-medium uppercase tracking-wide text-[#8E8E93]">
          次のマイルストーン
        </div>
        {summary.nextMilestone ? (
          <div className="mt-1 flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-[#1C1C1E]">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rotate-45"
                style={{ backgroundColor: "#AF52DE" }}
              />
              {summary.nextMilestone.name}
            </span>
            <span className="font-medium text-[#8E8E93]">
              {formatDate(summary.nextMilestone.start)}
            </span>
          </div>
        ) : (
          <p className="mt-1 text-sm text-[#C7C7CC]">未設定</p>
        )}
      </div>
    </Link>
  );
}
