import type { ProjectMeta, WbsTask } from "@/types/wbs";
import { getTasksBySlug } from "@/data/tasks";
import { getProject } from "@/data/projects";
import {
  NotionNotConfiguredError,
  fetchTasksFromNotion,
  isNotionConfigured,
  updateTaskInNotion,
  type NotionUpdate,
} from "./notion";

export type TaskSource = "notion" | "fallback";

export interface FetchTasksResult {
  tasks: WbsTask[];
  source: TaskSource;
}

export async function fetchProjectTasks(
  slug: string,
): Promise<FetchTasksResult> {
  const project = getProject(slug);
  if (!project) {
    return { tasks: [], source: "fallback" };
  }
  if (!isNotionConfigured()) {
    return { tasks: getTasksBySlug(slug), source: "fallback" };
  }
  try {
    const tasks = await fetchTasksFromNotion(project);
    return { tasks, source: "notion" };
  } catch (err) {
    if (!(err instanceof NotionNotConfiguredError)) {
      console.error(`[taskService] Notion fetch failed for ${slug}:`, err);
    }
    return { tasks: getTasksBySlug(slug), source: "fallback" };
  }
}

export async function applyTaskUpdate(
  project: ProjectMeta,
  taskId: string,
  update: NotionUpdate,
): Promise<{ persisted: boolean }> {
  if (!isNotionConfigured()) {
    return { persisted: false };
  }
  try {
    await updateTaskInNotion(taskId, update);
    return { persisted: true };
  } catch (err) {
    console.error(
      `[taskService] Notion update failed for ${project.slug}/${taskId}:`,
      err,
    );
    return { persisted: false };
  }
}
