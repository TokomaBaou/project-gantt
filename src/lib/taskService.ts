import type { ProjectMeta, WbsTask } from "@/types/wbs";
import { getTasksBySlug } from "@/data/tasks";
import { getProject } from "@/data/projects";
import { isoDateOnlyToDate } from "./taskWire";
import {
  NotionNotConfiguredError,
  fetchTasksFromNotion,
  isNotionConfigured,
  updateTaskInNotion,
  type NotionParseError,
  type NotionUpdate,
} from "./notion";

export type TaskSource = "notion" | "fallback";

export interface FetchTasksResult {
  tasks: WbsTask[];
  source: TaskSource;
  errors: NotionParseError[];
  fetchError?: string;
}

function buildHearingMilestones(project: ProjectMeta): WbsTask[] {
  if (!project.hearingStartDate) {
    return [];
  }
  const date = isoDateOnlyToDate(project.hearingStartDate);
  return [
    {
      id: `${project.slug}-hearing-start`,
      name: "ヒアリング開始",
      kind: "milestone",
      start: date,
      end: date,
      status: "done",
      phase: "ep1",
      assignee: "VJ",
      progress: 100,
    },
  ];
}

export async function fetchProjectTasks(
  slug: string,
  forceLocal = false,
): Promise<FetchTasksResult> {
  const project = getProject(slug);
  if (!project) {
    return { tasks: [], source: "fallback", errors: [] };
  }
  const hearingMilestones = buildHearingMilestones(project);
  if (forceLocal || project.useLocalTasks || !isNotionConfigured()) {
    return {
      tasks: [...getTasksBySlug(slug), ...hearingMilestones],
      source: "fallback",
      errors: [],
    };
  }
  try {
    const { tasks: notionTasks, errors } = await fetchTasksFromNotion(project);
    // The Notion DB has no "種別" column, so all rows are kind=task. Merge in
    // any milestones from the hardcoded fallback so they stay visible.
    const milestones = getTasksBySlug(slug).filter(
      (t) => t.kind === "milestone",
    );
    return {
      tasks: [...notionTasks, ...milestones, ...hearingMilestones],
      source: "notion",
      errors,
    };
  } catch (err) {
    if (!(err instanceof NotionNotConfiguredError)) {
      console.error(`[taskService] Notion fetch failed for ${slug}:`, err);
    }
    return {
      tasks: [...getTasksBySlug(slug), ...hearingMilestones],
      source: "fallback",
      errors: [],
      fetchError: err instanceof Error ? err.message : String(err),
    };
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
