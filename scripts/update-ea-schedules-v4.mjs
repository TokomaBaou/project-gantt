// Bulk-update Notion task schedules for the Enlight Academy project.
// v4: 2026-05-27 「LINE後回し、Web版本番リリースを6/30に新設」方針への全面変更
//   - LINE系タスクを 6/23-7/31 帯から 7/6-8/15 帯へ後ろ倒し
//   - 既存マイルストーン「Web版 β版リリース（機能追加）」を
//     「Web版本番リリース（リリースポイント）」(6/30) にリネーム
//   - 「LINE版リリース（リリースポイント）」を 7/31 → 8/15 に
//
// Usage:
//   node --env-file=.env.local scripts/update-ea-schedules-v4.mjs           # dry-run
//   node --env-file=.env.local scripts/update-ea-schedules-v4.mjs --apply   # actually write

import { Client, isFullPage } from "@notionhq/client";

const PROJECT_NAME = "Enlight Academy";
const PROP = {
  title: "名前",
  project: "プロジェクト",
  schedule: "スケジュール",
};

const YEAR = 2026;
const d = (mm, dd) =>
  `${YEAR}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

// keyword: substring (case-insensitive, whitespace-normalized) used to match
// against the Notion task name. The longest matching keyword wins when a task
// matches multiple entries.
// newTitle: 任意。指定された場合、タイトルも書き換える。
const SCHEDULE = [
  // EP-2 LINE系タスク（後ろ倒し）
  {
    keyword: "中間サーバー方式",
    start: d(7, 6),
    end: d(7, 24),
  },
  {
    keyword: "ログ基盤構築",
    start: d(7, 6),
    end: d(7, 17),
  },
  {
    keyword: "文字数・絵文字調整",
    start: d(7, 28),
    end: d(8, 8),
  },
  {
    keyword: "受け入れテスト",
    start: d(8, 4),
    end: d(8, 15),
  },

  // EP-1 マイルストーン: 「β版（機能追加）」廃止 → 「Web版本番リリース」(6/30)
  {
    keyword: "β版リリース",
    start: d(6, 30),
    end: d(6, 30),
    newTitle: "Web版本番リリース（リリースポイント）",
  },

  // EP-2 マイルストーン: LINE版リリース 7/31 → 8/15
  {
    keyword: "LINE版リリース",
    start: d(8, 15),
    end: d(8, 15),
  },
];

function normalize(s) {
  if (!s) {
    return "";
  }
  return s
    .toLowerCase()
    .replace(/\s+|　/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/／/g, "/");
}

function readTitle(page) {
  for (const v of Object.values(page.properties ?? {})) {
    if (v && v.type === "title") {
      return v.title.map((t) => t.plain_text).join("");
    }
  }
  return "";
}

function readSchedule(page) {
  const prop = page.properties?.[PROP.schedule];
  if (!prop || prop.type !== "date" || !prop.date) {
    return { start: null, end: null };
  }
  return { start: prop.date.start ?? null, end: prop.date.end ?? null };
}

function readProject(page) {
  const prop = page.properties?.[PROP.project];
  if (!prop) {
    return "";
  }
  if (prop.type === "select") {
    return prop.select?.name ?? "";
  }
  if (prop.type === "multi_select") {
    return prop.multi_select.map((s) => s.name).join(",");
  }
  return "";
}

async function resolveDataSourceId(notion, databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  if (
    "data_sources" in db &&
    Array.isArray(db.data_sources) &&
    db.data_sources.length > 0
  ) {
    return db.data_sources[0].id;
  }
  return databaseId;
}

async function fetchAllPages(notion, dataSourceId) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: PROP.project,
        select: { equals: PROJECT_NAME },
      },
      start_cursor: cursor,
    });
    for (const p of res.results) {
      if (isFullPage(p)) {
        pages.push(p);
      }
    }
    cursor = res.next_cursor ?? undefined;
  } while (cursor);
  return pages;
}

function findBestMatch(taskName) {
  const norm = normalize(taskName);
  let best = null;
  for (const entry of SCHEDULE) {
    const k = normalize(entry.keyword);
    if (k.length === 0) {
      continue;
    }
    if (norm.includes(k)) {
      if (!best || k.length > normalize(best.keyword).length) {
        best = entry;
      }
    }
  }
  return best;
}

function fmt(s, e) {
  if (!s && !e) {
    return "(未設定)";
  }
  if (s && e) {
    return `${s} → ${e}`;
  }
  return s ?? e ?? "";
}

async function main() {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_TASKS_DB_ID;
  if (!apiKey || !dbId) {
    console.error(
      "NOTION_API_KEY または NOTION_TASKS_DB_ID が設定されていません",
    );
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  console.log(
    `[mode] ${apply ? "APPLY (実書き込み)" : "DRY-RUN (確認のみ)"}\n`,
  );

  const notion = new Client({ auth: apiKey });
  const dataSourceId = await resolveDataSourceId(notion, dbId);
  console.log(`[query] data_source_id=${dataSourceId}`);
  const pages = await fetchAllPages(notion, dataSourceId);
  console.log(
    `[query] ${PROJECT_NAME} プロジェクトのタスク取得: ${pages.length}件\n`,
  );

  const eaPages = pages.filter((p) => readProject(p) === PROJECT_NAME);

  const matchedKeywords = new Set();
  const plans = [];

  for (const page of eaPages) {
    const name = readTitle(page);
    const current = readSchedule(page);
    const match = findBestMatch(name);
    if (!match) {
      continue;
    }
    matchedKeywords.add(match.keyword);

    const scheduleSame =
      current.start === match.start && current.end === match.end;
    const titleSame = !match.newTitle || name === match.newTitle;

    plans.push({
      id: page.id,
      name,
      keyword: match.keyword,
      before: current,
      after: { start: match.start, end: match.end },
      newTitle: match.newTitle ?? null,
      scheduleSame,
      titleSame,
    });
  }

  console.log(`=== 更新計画 (合計 ${plans.length}件) ===\n`);
  for (const p of plans) {
    const sTag = p.scheduleSame ? "[同値]" : "[更新]";
    console.log(`■ ${p.name}`);
    console.log(`  keyword: ${p.keyword}`);
    console.log(
      `  schedule ${sTag}: ${fmt(p.before.start, p.before.end)} → ${fmt(p.after.start, p.after.end)}`,
    );
    if (p.newTitle) {
      const tTag = p.titleSame ? "[同値]" : "[更新]";
      console.log(`  title    ${tTag}: ${p.name} → ${p.newTitle}`);
    }
    console.log(`  pageId: ${p.id}\n`);
  }

  const unmatchedKeywords = SCHEDULE.filter(
    (e) => !matchedKeywords.has(e.keyword),
  );
  if (unmatchedKeywords.length > 0) {
    console.log(
      `=== マッピングに対応するNotionタスクが見つからなかったキーワード (${unmatchedKeywords.length}件) ===`,
    );
    for (const e of unmatchedKeywords) {
      console.log(`  - ${e.keyword}  (${e.start} → ${e.end})`);
    }
    console.log();
  }

  if (!apply) {
    console.log("[dry-run] 何も書き込んでいません。--apply で実行します。");
    return;
  }

  console.log(`=== 実書き込み開始 ===`);
  let ok = 0;
  let fail = 0;
  let scheduleSkip = 0;
  let titleSkip = 0;
  for (const p of plans) {
    const properties = {};
    let scheduleWrote = false;
    let titleWrote = false;
    if (!p.scheduleSame) {
      properties[PROP.schedule] = {
        date: { start: p.after.start, end: p.after.end },
      };
      scheduleWrote = true;
    } else {
      scheduleSkip++;
    }
    if (p.newTitle && !p.titleSame) {
      properties[PROP.title] = {
        title: [{ type: "text", text: { content: p.newTitle } }],
      };
      titleWrote = true;
    } else if (p.newTitle) {
      titleSkip++;
    }
    if (!scheduleWrote && !titleWrote) {
      console.log(`  - ${p.name} (変更なし、スキップ)`);
      continue;
    }
    try {
      await notion.pages.update({
        page_id: p.id,
        properties,
      });
      ok++;
      const parts = [];
      if (scheduleWrote) {
        parts.push("schedule");
      }
      if (titleWrote) {
        parts.push("title");
      }
      console.log(`  ✔ ${p.name} (${parts.join("+")})`);
    } catch (err) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✘ ${p.name} — ${msg}`);
    }
  }
  console.log(
    `\n=== 完了: 成功 ${ok}件 / 失敗 ${fail}件 / schedule同値 ${scheduleSkip}件 / title同値 ${titleSkip}件 ===`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
