// Bulk-update Notion task schedules for the Enlight Academy project.
// v2: 2026-05-27 リスケジュール反映
//
// Usage:
//   node --env-file=.env.local scripts/update-ea-schedules-v2.mjs           # dry-run
//   node --env-file=.env.local scripts/update-ea-schedules-v2.mjs --apply   # actually write

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
//
// マッチング戦略:
//   - Phase/Epic 名は短めキーワード (例: "コンテンツ拡充") で部分一致
//   - 子タスクは長いキーワード or 一意な特徴語 (例: "中間サーバー方式") を使い、
//     親や別タスクへ波及しないように調整
//   - "LINE版リリース" は Phase ("受講後bot: LINE版 リリース") と Epic
//     ("LINE版リリース") の両方を同じスケジュールに揃える
const SCHEDULE = [
  // Phases (parent=なし) ─────────────────────────────────────────
  // 受講後bot: LINE版 リリース (phase) + LINE版リリース (epic) を両方更新
  { keyword: "LINE版リリース", start: d(6, 23), end: d(7, 31) },
  // 受講後bot: 運用・精度改善 (phase)
  { keyword: "運用・精度改善", start: d(8, 4), end: d(9, 30) },
  // 受講前bot (phase)
  { keyword: "受講前bot", start: d(8, 4), end: d(9, 5) },

  // Epics under EP-1 ──────────────────────────────────────────────
  // Web版+辞書・コンテンツ拡充
  { keyword: "コンテンツ拡充", start: d(5, 14), end: d(6, 20) },
  // Web版+レコメンド・導線強化
  { keyword: "レコメンド・導線強化", start: d(6, 9), end: d(6, 27) },

  // EP-1 tasks ────────────────────────────────────────────────────
  // 「スピリチュアル用語辞典212語Embedding」と「用語辞典 212語 Embedding検索」両方
  { keyword: "212語", start: d(5, 13), end: d(6, 6) },
  // 「用語辞典スプシFB反映」と「用語辞典スプシ FB反映」両方 (normalize で空白除去)
  { keyword: "用語辞典スプシFB反映", start: d(5, 12), end: d(6, 6) },
  { keyword: "会員サイトコンテンツ取り込み", start: d(5, 26), end: d(6, 13) },
  {
    keyword: "動画トランスクリプト取り込みパイプライン構築",
    start: d(5, 19),
    end: d(6, 6),
  },
  { keyword: "講座動画トランスクリプト取り込み", start: d(5, 18), end: d(6, 16) },
  { keyword: "ゴールデンアンサー蓄積", start: d(5, 12), end: d(7, 14) },
  // UTAGE回答履歴収集（教師データ）
  { keyword: "UTAGE", start: d(5, 14), end: d(6, 23) },
  { keyword: "予測提案機能", start: d(6, 9), end: d(6, 20) },
  // 重複2件の「会員サイトリンク表示」を両方更新
  { keyword: "会員サイトリンク表示", start: d(6, 16), end: d(6, 27) },

  // EP-2 tasks (under LINE版リリース) ─────────────────────────────
  // 「LINE組み込み（中間サーバー方式）」のみを特定 (受講前bot 配下の "LINE組み込み"
  // とは区別するため "中間サーバー方式" キーワードを使用)
  { keyword: "中間サーバー方式", start: d(6, 23), end: d(7, 11) },
  { keyword: "ログ基盤構築", start: d(6, 23), end: d(7, 4) },
  { keyword: "文字数・絵文字調整", start: d(7, 14), end: d(7, 25) },
  { keyword: "受け入れテスト", start: d(7, 21), end: d(7, 31) },

  // EP-3 tasks (under 受講後bot: 運用・精度改善) ─────────────────
  { keyword: "メソッド回答精度チューニング", start: d(8, 4), end: d(8, 22) },
  { keyword: "GPTファインチューニング実施", start: d(8, 25), end: d(9, 12) },
  { keyword: "LLM使い分け最適化", start: d(8, 25), end: d(9, 30) },

  // EP-4 tasks (under 受講前bot) ─────────────────────────────────
  // 「入会前FAQ検索統合」と「入会前FAQ検索統合+分岐実装」両方を同期
  { keyword: "入会前FAQ検索統合", start: d(8, 4), end: d(8, 15) },
  // 「入会前/後判別方式設計」を特定 (「の」抜きの実 Notion 表記に合わせる)
  { keyword: "判別方式設計", start: d(8, 4), end: d(8, 22) },
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
  // 動的に title 型プロパティを探す (DBによって "名前" / "マイルストーン" など名称が違うため)
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
  if (eaPages.length !== pages.length) {
    console.warn(
      `[warn] プロジェクト不一致を除外: ${pages.length - eaPages.length}件`,
    );
  }

  const matchedKeywords = new Set();
  const plans = [];
  const skippedNoMatch = [];

  for (const page of eaPages) {
    const name = readTitle(page);
    const current = readSchedule(page);
    const match = findBestMatch(name);
    if (!match) {
      skippedNoMatch.push({ id: page.id, name });
      continue;
    }
    matchedKeywords.add(match.keyword);

    const sameStart = current.start === match.start;
    const sameEnd = current.end === match.end;
    if (sameStart && sameEnd) {
      plans.push({
        id: page.id,
        name,
        keyword: match.keyword,
        before: current,
        after: { start: match.start, end: match.end },
        noop: true,
      });
      continue;
    }

    plans.push({
      id: page.id,
      name,
      keyword: match.keyword,
      before: current,
      after: { start: match.start, end: match.end },
      noop: false,
    });
  }

  console.log(`=== 更新計画 (合計 ${plans.length}件) ===`);
  for (const p of plans) {
    const tag = p.noop ? "[同値・更新不要]" : "[更新]";
    console.log(
      `${tag} ${p.name}\n  keyword: ${p.keyword}\n  before:  ${fmt(p.before.start, p.before.end)}\n  after:   ${fmt(p.after.start, p.after.end)}\n  pageId:  ${p.id}`,
    );
  }

  if (skippedNoMatch.length > 0) {
    console.log(
      `\n=== マッチしなかった EA タスク (${skippedNoMatch.length}件) ===`,
    );
    for (const s of skippedNoMatch) {
      console.log(`  - ${s.name}  (id=${s.id})`);
    }
  }

  const unmatchedKeywords = SCHEDULE.filter(
    (e) => !matchedKeywords.has(e.keyword),
  );
  if (unmatchedKeywords.length > 0) {
    console.log(
      `\n=== マッピングに対応するNotionタスクが見つからなかったキーワード (${unmatchedKeywords.length}件) ===`,
    );
    for (const e of unmatchedKeywords) {
      console.log(`  - ${e.keyword}  (${e.start} → ${e.end})`);
    }
  }

  if (!apply) {
    console.log("\n[dry-run] 何も書き込んでいません。--apply で実行します。");
    return;
  }

  const toUpdate = plans.filter((p) => !p.noop);
  console.log(`\n=== 実書き込み開始: ${toUpdate.length}件 ===`);
  let ok = 0;
  let fail = 0;
  for (const p of toUpdate) {
    try {
      await notion.pages.update({
        page_id: p.id,
        properties: {
          [PROP.schedule]: {
            date: { start: p.after.start, end: p.after.end },
          },
        },
      });
      ok++;
      console.log(`  ✔ ${p.name}`);
    } catch (err) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✘ ${p.name} — ${msg}`);
    }
  }
  console.log(`\n=== 完了: 成功 ${ok}件 / 失敗 ${fail}件 ===`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
