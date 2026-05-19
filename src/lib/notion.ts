import { Client, isFullPage } from "@notionhq/client";
import type {
  PageObjectResponse,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { STATUS_LABELS } from "@/types/wbs";
import type {
  PhaseMeta,
  ProjectMeta,
  TaskKind,
  TaskStatus,
  WbsTask,
} from "@/types/wbs";

/**
 * Notion property name mapping. Adjust if the team's n8n bot uses different
 * names — these must match the actual Notion database columns.
 */
const NOTION_PROPS = {
  title: "タイトル",
  status: "ステータス",
  assignee: "担当",
  start: "開始日",
  end: "終了日",
  progress: "進捗率",
  phase: "Phase",
  project: "プロジェクト",
  kind: "種別",
} as const;

const STATUS_BY_LABEL: Record<string, TaskStatus> = {
  完了: "done",
  進行中: "inProgress",
  FB待ち: "waiting",
  待ち: "waiting",
  予定: "planned",
  新規: "new",
};

const KIND_BY_LABEL: Record<string, TaskKind> = {
  task: "task",
  milestone: "milestone",
  タスク: "task",
  マイルストーン: "milestone",
};

export class NotionNotConfiguredError extends Error {
  constructor() {
    super("NOTION_API_KEY or NOTION_TASKS_DB_ID is not set");
    this.name = "NotionNotConfiguredError";
  }
}

export function isNotionConfigured(): boolean {
  return Boolean(process.env.NOTION_API_KEY && process.env.NOTION_TASKS_DB_ID);
}

function getClient(): Client {
  if (!isNotionConfigured()) {
    throw new NotionNotConfiguredError();
  }
  return new Client({ auth: process.env.NOTION_API_KEY });
}

function getDatabaseId(): string {
  const id = process.env.NOTION_TASKS_DB_ID;
  if (!id) {
    throw new NotionNotConfiguredError();
  }
  return id;
}

let cachedDataSourceId: string | null = null;

async function resolveDataSourceId(notion: Client): Promise<string> {
  if (cachedDataSourceId) {
    return cachedDataSourceId;
  }
  const id = getDatabaseId();
  const db = await notion.databases.retrieve({ database_id: id });
  if (
    "data_sources" in db &&
    Array.isArray(db.data_sources) &&
    db.data_sources.length > 0
  ) {
    cachedDataSourceId = db.data_sources[0].id;
    return cachedDataSourceId;
  }
  // Legacy fallback: treat the configured ID as a data source id directly.
  cachedDataSourceId = id;
  return cachedDataSourceId;
}

export async function fetchTasksFromNotion(
  project: ProjectMeta,
): Promise<WbsTask[]> {
  const notion = getClient();
  const dataSourceId = await resolveDataSourceId(notion);
  const results: PageObjectResponse[] = [];

  let cursor: string | undefined;
  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: NOTION_PROPS.project,
        select: { equals: project.slug },
      },
      start_cursor: cursor,
    });
    for (const page of response.results) {
      if (isFullPage(page)) {
        results.push(page);
      }
    }
    cursor = response.next_cursor ?? undefined;
  } while (cursor);

  const tasks: WbsTask[] = [];
  for (const page of results) {
    const task = mapPageToTask(page, project.phases);
    if (task) {
      tasks.push(task);
    }
  }
  return tasks;
}

export interface NotionUpdate {
  status?: TaskStatus;
  assignee?: string;
  start?: Date;
  end?: Date;
  progress?: number;
}

export async function updateTaskInNotion(
  pageId: string,
  update: NotionUpdate,
): Promise<void> {
  const notion = getClient();
  const properties: NonNullable<UpdatePageParameters["properties"]> = {};

  if (update.status !== undefined) {
    properties[NOTION_PROPS.status] = {
      select: { name: STATUS_LABELS[update.status] },
    };
  }
  if (update.assignee !== undefined) {
    properties[NOTION_PROPS.assignee] = {
      select: { name: update.assignee },
    };
  }
  if (update.start !== undefined) {
    properties[NOTION_PROPS.start] = {
      date: { start: toISODateOnly(update.start) },
    };
  }
  if (update.end !== undefined) {
    properties[NOTION_PROPS.end] = {
      date: { start: toISODateOnly(update.end) },
    };
  }
  if (update.progress !== undefined) {
    properties[NOTION_PROPS.progress] = { number: update.progress };
  }

  await notion.pages.update({ page_id: pageId, properties });
}

function mapPageToTask(
  page: PageObjectResponse,
  phases: PhaseMeta[],
): WbsTask | null {
  const name = readTitle(page, NOTION_PROPS.title);
  if (!name) {
    return null;
  }

  const start = readDate(page, NOTION_PROPS.start);
  const end = readDate(page, NOTION_PROPS.end) ?? start;
  if (!start || !end) {
    return null;
  }

  const statusLabel = readSelect(page, NOTION_PROPS.status);
  const status: TaskStatus =
    statusLabel && statusLabel in STATUS_BY_LABEL
      ? STATUS_BY_LABEL[statusLabel]
      : "planned";

  const kindLabel = readSelect(page, NOTION_PROPS.kind);
  const kind: TaskKind =
    kindLabel && kindLabel in KIND_BY_LABEL ? KIND_BY_LABEL[kindLabel] : "task";

  const phaseLabel = readSelect(page, NOTION_PROPS.phase) ?? "";
  const phase = resolvePhaseId(phaseLabel, phases);

  return {
    id: page.id,
    name,
    kind,
    start,
    end,
    status,
    assignee: readAssignee(page, NOTION_PROPS.assignee),
    phase,
    progress: readNumber(page, NOTION_PROPS.progress) ?? 0,
  };
}

function resolvePhaseId(notionValue: string, phases: PhaseMeta[]): string {
  if (!notionValue) {
    return phases[0]?.id ?? "phase1";
  }
  const exact = phases.find((p) => p.label === notionValue);
  if (exact) {
    return exact.id;
  }
  const idMatch = phases.find((p) => p.id === notionValue);
  if (idMatch) {
    return idMatch.id;
  }
  const m = notionValue.match(/Phase\s*(\d+)/i);
  if (m) {
    const idx = Number.parseInt(m[1], 10) - 1;
    if (phases[idx]) {
      return phases[idx].id;
    }
  }
  return phases[0]?.id ?? "phase1";
}

function readTitle(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop];
  if (p && p.type === "title") {
    return p.title.map((t) => t.plain_text).join("");
  }
  return "";
}

function readSelect(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop];
  if (p && p.type === "select") {
    return p.select?.name ?? null;
  }
  if (p && p.type === "status") {
    return p.status?.name ?? null;
  }
  return null;
}

function readDate(page: PageObjectResponse, prop: string): Date | null {
  const p = page.properties[prop];
  if (p && p.type === "date" && p.date?.start) {
    return parseISODateOnly(p.date.start);
  }
  return null;
}

function readNumber(page: PageObjectResponse, prop: string): number | null {
  const p = page.properties[prop];
  if (p && p.type === "number") {
    return p.number;
  }
  return null;
}

function readAssignee(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop];
  if (!p) {
    return "";
  }
  if (p.type === "select") {
    return p.select?.name ?? "";
  }
  if (p.type === "rich_text") {
    return p.rich_text.map((t) => t.plain_text).join("");
  }
  if (p.type === "people") {
    return p.people
      .map((person) => ("name" in person ? (person.name ?? "") : ""))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function parseISODateOnly(iso: string): Date {
  const dateOnly = iso.slice(0, 10);
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
