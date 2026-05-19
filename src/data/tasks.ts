import type { WbsTask } from "@/types/wbs";
import { EA_TASKS } from "./tasks-ea";
import { DIT_TASKS } from "./tasks-dit";

const TASKS_BY_SLUG: Record<string, WbsTask[]> = {
  ea: EA_TASKS,
  dit: DIT_TASKS,
};

export function getTasksBySlug(slug: string): WbsTask[] {
  return TASKS_BY_SLUG[slug] ?? [];
}
