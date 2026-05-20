import { Client, isFullPage } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDataSourceParameters,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import type { PhaseMeta, ProjectMeta, TaskStatus, WbsTask } from "@/types/wbs";

/**
 * Notion property name mapping for the shared engineer task DB.
 * Adjust to match the actual column names of NOTION_TASKS_DB_ID.
 */
const NOTION_PROPS = {
  title: "名前",
  status: "開発ステータス",
  assignee: "担当者",
  schedule: "スケジュール",
  progress: "進捗率",
  project: "プロジェクト",
} as const;

const STATUS_BY_LABEL: Record<string, TaskStatus> = {
  完了: "done",
  開発中: "inProgress",
  テスト中: "inProgress",
  レビュー中: "inProgress",
  設計中: "planned",
  着手待ち: "planned",
  ペンディング: "waiting",
};

/**
 * Status values written back to Notion. Must exist as options in
 * the "開発ステータス" status column, otherwise the update will fail.
 */
const STATUS_WRITE_LABEL: Record<TaskStatus, string> = {
  done: "完了",
  inProgress: "開発中",
  planned: "着手待ち",
  waiting: "ペンディング",
  new: "設計中",
};

/**
 * Optional translation from the raw Notion user name (returned by the
 * "担当者" people property) to the short alias used in the UI.
 * Populate this once the actual Notion user names are known.
 */
const ASSIGNEE_ALIAS: Record<string, string> = {
  // "Makoto Oba": "VJ",
  // "Engineer A": "EA",
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
  cachedDataSourceId = id;
  return cachedDataSourceId;
}

function buildProjectFilter(
  project: ProjectMeta,
): QueryDataSourceParameters["filter"] {
  const names = project.notionProjectNames ?? [project.name];
  return {
    or: names.map((name) => ({
      property: NOTION_PROPS.project,
      select: { equals: name },
    })),
  };
}

export interface NotionParseError {
  id: string;
  name: string;
  reason: string;
}

export interface FetchNotionResult {
  tasks: WbsTask[];
  errors: NotionParseError[];
}

export async function fetchTasksFromNotion(
  project: ProjectMeta,
): Promise<FetchNotionResult> {
  const notion = getClient();
  const dataSourceId = await resolveDataSourceId(notion);
  const results: PageObjectResponse[] = [];

  let cursor: string | undefined;
  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: buildProjectFilter(project),
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
  const errors: NotionParseError[] = [];

  for (const page of results) {
    let safeName = "";
    try {
      safeName = readTitle(page, NOTION_PROPS.title);
    } catch {
      // ignore — falls through to error reporting below
    }
    try {
      tasks.push(mapPageToTask(page, project.phases));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(
        `[notion] failed to parse page ${page.id} (${safeName || "(no title)"}): ${reason}`,
      );
      errors.push({
        id: page.id,
        name: safeName || "(無題)",
        reason,
      });
    }
  }

  return { tasks, errors };
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
      status: { name: STATUS_WRITE_LABEL[update.status] },
    };
  }

  // 担当者 (people) updates need Notion user IDs, not names, so skip writing
  // here. Users must reassign manually in Notion.

  if (update.start !== undefined && update.end !== undefined) {
    properties[NOTION_PROPS.schedule] = {
      date: {
        start: toISODateOnly(update.start),
        end: toISODateOnly(update.end),
      },
    };
  } else if (update.start !== undefined) {
    properties[NOTION_PROPS.schedule] = {
      date: { start: toISODateOnly(update.start) },
    };
  }

  if (update.progress !== undefined) {
    // Notion percent-formatted number stores 0-1, not 0-100.
    properties[NOTION_PROPS.progress] = {
      number: update.progress / 100,
    };
  }

  await notion.pages.update({ page_id: pageId, properties });
}

function mapPageToTask(page: PageObjectResponse, phases: PhaseMeta[]): WbsTask {
  const name = readTitle(page, NOTION_PROPS.title) || "(無題)";

  const range =
    readDateRange(page, NOTION_PROPS.schedule) ?? defaultDateRange();

  const statusLabel = readStatus(page, NOTION_PROPS.status);
  const status: TaskStatus =
    statusLabel && statusLabel in STATUS_BY_LABEL
      ? STATUS_BY_LABEL[statusLabel]
      : "planned";

  const rawAssignee = readPeople(page, NOTION_PROPS.assignee);
  const assigneeBase = rawAssignee || "未割当";
  const assignee =
    assigneeBase in ASSIGNEE_ALIAS
      ? ASSIGNEE_ALIAS[assigneeBase]
      : assigneeBase;

  const progressRaw = readNumber(page, NOTION_PROPS.progress);
  const progress =
    progressRaw == null || !Number.isFinite(progressRaw)
      ? 0
      : Math.round(progressRaw * 100);

  return {
    id: page.id,
    name,
    kind: "task",
    start: range.start,
    end: range.end,
    status,
    assignee,
    phase: phases[0]?.id ?? "phase1",
    progress,
  };
}

function defaultDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start: today, end: today };
}

function readTitle(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop];
  if (p && p.type === "title") {
    return p.title.map((t) => t.plain_text).join("");
  }
  return "";
}

function readStatus(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop];
  if (p && p.type === "status") {
    return p.status?.name ?? null;
  }
  if (p && p.type === "select") {
    return p.select?.name ?? null;
  }
  return null;
}

function readDateRange(
  page: PageObjectResponse,
  prop: string,
): { start: Date; end: Date } | null {
  const p = page.properties[prop];
  if (!p || p.type !== "date" || !p.date?.start) {
    return null;
  }
  const start = parseISODateOnly(p.date.start);
  if (!start) {
    return null;
  }
  const end = p.date.end ? (parseISODateOnly(p.date.end) ?? start) : start;
  return { start, end };
}

function readNumber(page: PageObjectResponse, prop: string): number | null {
  const p = page.properties[prop];
  if (p && p.type === "number") {
    return p.number;
  }
  return null;
}

function readPeople(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop];
  if (!p || p.type !== "people") {
    return "";
  }
  return p.people
    .map((person) => ("name" in person ? (person.name ?? "") : ""))
    .filter(Boolean)
    .join(", ");
}

function parseISODateOnly(iso: string): Date | null {
  if (!iso) {
    return null;
  }
  const parts = iso.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function toISODateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
