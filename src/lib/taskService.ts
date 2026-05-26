import type { PhaseMeta, ProjectMeta, WbsTask } from "@/types/wbs";
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
  phases: PhaseMeta[];
  source: TaskSource;
  errors: NotionParseError[];
  fetchError?: string;
}

function buildHearingMilestones(
  project: ProjectMeta,
  phaseId: string,
): WbsTask[] {
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
      phase: phaseId,
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
    return { tasks: [], phases: [], source: "fallback", errors: [] };
  }
  if (forceLocal || !isNotionConfigured()) {
    const localTasks = getTasksBySlug(slug);
    const hearingMilestones = buildHearingMilestones(
      project,
      localTasks[0]?.phase ?? project.phases[0]?.id ?? "phase1",
    );
    return {
      tasks: [...localTasks, ...hearingMilestones],
      phases: project.phases,
      source: "fallback",
      errors: [],
    };
  }
  try {
    const {
      tasks: notionTasks,
      phases: notionPhases,
      errors,
    } = await fetchTasksFromNotion(project);

    const phases = notionPhases.length > 0 ? notionPhases : project.phases;
    const firstPhaseId = phases[0]?.id ?? "phase1";
    const hearingMilestones = buildHearingMilestones(project, firstPhaseId);
    return {
      tasks: [...notionTasks, ...hearingMilestones],
      phases,
      source: "notion",
      errors,
    };
  } catch (err) {
    if (!(err instanceof NotionNotConfiguredError)) {
      console.error(`[taskService] Notion fetch failed for ${slug}:`, err);
    }
    const localTasks = getTasksBySlug(slug);
    const hearingMilestones = buildHearingMilestones(
      project,
      localTasks[0]?.phase ?? project.phases[0]?.id ?? "phase1",
    );
    return {
      tasks: [...localTasks, ...hearingMilestones],
      phases: project.phases,
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
