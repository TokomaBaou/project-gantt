// Bulk-update Notion task schedules + assignees for the Enlight Academy project.
// v3: 2026-05-27 同時並行を避けるためタスクを週単位で分散
//
// Usage:
//   node --env-file=.env.local scripts/update-ea-schedules-v3.mjs           # dry-run
//   node --env-file=.env.local scripts/update-ea-schedules-v3.mjs --apply   # actually write

import { Client, isFullPage } from "@notionhq/client";

const PROJECT_NAME = "Enlight Academy";
const PROP = {
  title: "名前",
  project: "プロジェクト",
  schedule: "スケジュール",
  assignee: "担当者",
};

// Notion user IDs (resolved from users.list on 2026-05-27)
const USER = {
  oba: {
    id: "32af2e4d-5efa-409f-81d8-daaef5181652",
    name: "Makoto Oba (大場)",
  },
  sakurai: {
    id: "b6e75682-c083-42e5-8843-fe8e48396912",
    name: "SakuraiHiroaki (櫻井)",
  },
};

const YEAR = 2026;
const d = (mm, dd) =>
  `${YEAR}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

// keyword: substring (case-insensitive, whitespace-normalized) used to match
// against the Notion task name. The longest matching keyword wins when a task
// matches multiple entries.
const SCHEDULE = [
  // EP-1 tasks (分散配置)
  { keyword: "212語", start: d(5, 26), end: d(6, 6), assignee: USER.oba },
  {
    keyword: "用語辞典スプシFB反映",
    start: d(5, 26),
    end: d(6, 6),
    assignee: USER.sakurai,
  },
  {
    keyword: "会員サイトコンテンツ取り込み",
    start: d(6, 2),
    end: d(6, 13),
    assignee: USER.oba,
  },
  {
    keyword: "動画トランスクリプト取り込みパイプライン構築",
    start: d(6, 2),
    end: d(6, 13),
    assignee: USER.oba,
  },
  {
    keyword: "講座動画トランスクリプト取り込み",
    start: d(6, 9),
    end: d(6, 20),
    assignee: USER.oba,
  },
  {
    keyword: "ゴールデンアンサー蓄積",
    start: d(5, 12),
    end: d(7, 14),
    assignee: USER.oba,
  },
  // UTAGE回答履歴収集（教師データ）
  { keyword: "UTAGE", start: d(5, 14), end: d(6, 23), assignee: USER.oba },
  {
    keyword: "予測提案機能",
    start: d(6, 2),
    end: d(6, 13),
    assignee: USER.sakurai,
  },
  {
    keyword: "会員サイトリンク表示",
    start: d(6, 9),
    end: d(6, 20),
    assignee: USER.sakurai,
  },

  // EP-2 tasks
  {
    keyword: "中間サーバー方式",
    start: d(6, 23),
    end: d(7, 11),
    assignee: USER.oba,
  },
  {
    keyword: "ログ基盤構築",
    start: d(6, 23),
    end: d(7, 4),
    assignee: USER.sakurai,
  },
  {
    keyword: "文字数・絵文字調整",
    start: d(7, 14),
    end: d(7, 25),
    assignee: USER.oba,
  },
  {
    keyword: "受け入れテスト",
    start: d(7, 21),
    end: d(7, 31),
    assignee: USER.sakurai,
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

function readAssignees(page) {
  const prop = page.properties?.[PROP.assignee];
  if (!prop || prop.type !== "people") {
    return [];
  }
  return prop.people.map((p) => ({ id: p.id, name: p.name ?? "" }));
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

function fmtAssignees(arr) {
  if (!arr || arr.length === 0) {
    return "(未設定)";
  }
  return arr.map((a) => a.name || a.id).join(", ");
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
    const currentAssignees = readAssignees(page);
    const match = findBestMatch(name);
    if (!match) {
      continue;
    }
    matchedKeywords.add(match.keyword);

    const desiredAssignee = match.assignee;
    const hasDesired = currentAssignees.some(
      (a) => a.id === desiredAssignee.id,
    );
    const scheduleSame =
      current.start === match.start && current.end === match.end;
    const assigneeSame = hasDesired && currentAssignees.length === 1;

    plans.push({
      id: page.id,
      name,
      keyword: match.keyword,
      before: current,
      after: { start: match.start, end: match.end },
      assigneeBefore: currentAssignees,
      assigneeAfter: desiredAssignee,
      scheduleSame,
      assigneeSame,
    });
  }

  console.log(`=== 更新計画 (合計 ${plans.length}件) ===\n`);
  for (const p of plans) {
    const sTag = p.scheduleSame ? "[同値]" : "[更新]";
    const aTag = p.assigneeSame ? "[同値]" : "[更新]";
    console.log(`■ ${p.name}`);
    console.log(`  keyword: ${p.keyword}`);
    console.log(
      `  schedule ${sTag}: ${fmt(p.before.start, p.before.end)} → ${fmt(p.after.start, p.after.end)}`,
    );
    console.log(
      `  assignee ${aTag}: ${fmtAssignees(p.assigneeBefore)} → ${p.assigneeAfter.name}`,
    );
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
  let assigneeSkip = 0;
  for (const p of plans) {
    const properties = {};
    let scheduleWrote = false;
    let assigneeWrote = false;
    if (!p.scheduleSame) {
      properties[PROP.schedule] = {
        date: { start: p.after.start, end: p.after.end },
      };
      scheduleWrote = true;
    } else {
      scheduleSkip++;
    }
    if (!p.assigneeSame) {
      properties[PROP.assignee] = {
        people: [{ id: p.assigneeAfter.id }],
      };
      assigneeWrote = true;
    } else {
      assigneeSkip++;
    }
    if (!scheduleWrote && !assigneeWrote) {
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
      if (assigneeWrote) {
        parts.push("assignee");
      }
      console.log(`  ✔ ${p.name} (${parts.join("+")})`);
    } catch (err) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✘ ${p.name} — ${msg}`);
    }
  }
  console.log(
    `\n=== 完了: 成功 ${ok}件 / 失敗 ${fail}件 / schedule同値 ${scheduleSkip}件 / assignee同値 ${assigneeSkip}件 ===`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
