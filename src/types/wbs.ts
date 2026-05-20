export type TaskStatus = "done" | "inProgress" | "waiting" | "planned" | "new";

export type TaskKind = "task" | "milestone";

export type TaskScope = "A" | "B" | "C";

export interface PhaseMeta {
  id: string;
  label: string;
  goal?: string;
}

export interface WbsTask {
  id: string;
  name: string;
  kind: TaskKind;
  start: Date;
  end: Date;
  status: TaskStatus;
  assignee: string;
  phase: string;
  progress: number;
  scope?: TaskScope;
}

export interface ProjectMeta {
  slug: string;
  name: string;
  description: string;
  phases: PhaseMeta[];
  /**
   * Values that should match the Notion "プロジェクト" select property.
   * If omitted, falls back to `[name]`.
   */
  notionProjectNames?: string[];
  /**
   * ISO date (YYYY-MM-DD) when the project hearing started. When set, a
   * "ヒアリング開始" milestone is injected for the project.
   */
  hearingStartDate?: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  done: "完了",
  inProgress: "進行中",
  waiting: "FB待ち",
  planned: "予定",
  new: "新規",
};
