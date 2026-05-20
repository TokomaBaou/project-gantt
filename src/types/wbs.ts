export type TaskStatus = "done" | "inProgress" | "waiting" | "planned" | "new";

export type TaskKind = "task" | "milestone";

/**
 * スコープシナリオの段階。
 * A: 2ヶ月以内 / B: 2ヶ月+2〜3週間 / C: 3ヶ月以上。
 * 未設定のタスクはパターンAに含めて扱う。
 */
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
   * ヒアリング開始日（YYYY-MM-DD）。設定すると、ガントチャート上に
   * タイムラインの起点を示す「ヒアリング開始」マイルストーンを表示する。
   */
  hearingStartDate?: string;
  /**
   * true の場合、Notion を参照せず常にローカルの tasks-*.ts を
   * データソースにする。コード側で WBS を再構成し、Notion DB の
   * タスク構成と乖離している案件向け。
   */
  useLocalTasks?: boolean;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  done: "完了",
  inProgress: "進行中",
  waiting: "FB待ち",
  planned: "予定",
  new: "新規",
};
