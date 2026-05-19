import type { WbsTask } from "@/types/wbs";

export interface ProjectSummary {
  totalTasks: number;
  doneTasks: number;
  progress: number;
  nextMilestone: WbsTask | null;
}

export function summarizeProject(
  tasks: WbsTask[],
  today: Date,
): ProjectSummary {
  const tasksOnly = tasks.filter((t) => t.kind === "task");
  const milestones = tasks.filter((t) => t.kind === "milestone");

  const doneTasks = tasksOnly.filter((t) => t.status === "done").length;
  const progress =
    tasksOnly.length === 0
      ? 0
      : Math.round(
          tasksOnly.reduce((sum, t) => sum + t.progress, 0) / tasksOnly.length,
        );

  const upcoming = milestones
    .filter((m) => m.start.getTime() >= startOfDay(today).getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    totalTasks: tasksOnly.length,
    doneTasks,
    progress,
    nextMilestone: upcoming[0] ?? null,
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}
