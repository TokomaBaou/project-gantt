import { STATUS_PROGRESS_DEFAULT } from "@/lib/statusColors";
import type { TaskKind, TaskScope, TaskStatus, WbsTask } from "@/types/wbs";

const YEAR = 2026;

const d = (month: number, day: number): Date => new Date(YEAR, month - 1, day);

interface SeedTask {
  id: string;
  name: string;
  kind?: TaskKind;
  status: TaskStatus;
  assignee: string;
  start: [number, number];
  end: [number, number];
  phase: string;
  scope?: TaskScope;
}

const SEED: SeedTask[] = [
  // ─── EP-1: 受講前bot（1ヶ月目安 — 5月〜6月中旬） ──────────────
  {
    id: "ea-pre-01",
    name: "入会前FAQ取り込み（kaeru.jp）",
    status: "planned",
    assignee: "VJ",
    start: [5, 20],
    end: [5, 26],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-pre-02",
    name: "入会前/後の判別方式設計",
    status: "planned",
    assignee: "VJ",
    start: [5, 20],
    end: [5, 26],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-pre-03",
    name: "入会前FAQ検索統合",
    status: "planned",
    assignee: "VJ",
    start: [5, 26],
    end: [6, 2],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-pre-04",
    name: "受け入れテスト+本番リリース準備",
    status: "planned",
    assignee: "VJ",
    start: [6, 2],
    end: [6, 9],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-pre-05",
    name: "LINE組み込み（中間サーバー方式）",
    status: "planned",
    assignee: "VJ",
    start: [6, 9],
    end: [6, 20],
    phase: "ep1",
    scope: "A",
  },

  // ─── EP-1: マイルストーン ──────────────────────────────────
  {
    id: "ea-m-pre-release",
    name: "受講前bot本番リリース",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [6, 20],
    end: [6, 20],
    phase: "ep1",
    scope: "A",
  },

  // ─── EP-2: 受講後bot（2ヶ月目安 — 5月〜7月末） ── 完了済み ──
  {
    id: "ea-post-01",
    name: "サロンFAQ取り込み（45件）",
    status: "done",
    assignee: "VJ",
    start: [5, 5],
    end: [5, 9],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-02",
    name: "Agentic RAG実装",
    status: "done",
    assignee: "VJ",
    start: [5, 8],
    end: [5, 12],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-03",
    name: "ネガティブ検知+Slack通知",
    status: "done",
    assignee: "VJ",
    start: [5, 12],
    end: [5, 12],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-04",
    name: "短文回答（LINE想定3行以内）",
    status: "done",
    assignee: "VJ",
    start: [5, 12],
    end: [5, 12],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-05",
    name: "FAQ回答精度チューニング",
    status: "done",
    assignee: "VJ",
    start: [5, 12],
    end: [5, 14],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-06",
    name: "デプロイ",
    status: "done",
    assignee: "VJ",
    start: [5, 9],
    end: [5, 9],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-07",
    name: "スピリチュアル用語辞典212語Embedding",
    status: "done",
    assignee: "VJ",
    start: [5, 13],
    end: [5, 19],
    phase: "ep2",
    scope: "A",
  },

  // ─── EP-2: 受講後bot ── 進行中・FB待ち ──────────────────────
  {
    id: "ea-post-08",
    name: "用語辞典スプシFB反映",
    status: "waiting",
    assignee: "EA",
    start: [5, 12],
    end: [5, 26],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-09",
    name: "講座動画トランスクリプト取り込み",
    status: "inProgress",
    assignee: "VJ",
    start: [5, 18],
    end: [6, 9],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-10",
    name: "会員サイトコンテンツ取り込み",
    status: "waiting",
    assignee: "VJ",
    start: [5, 26],
    end: [6, 9],
    phase: "ep2",
    scope: "B",
  },
  {
    id: "ea-post-11",
    name: "UTAGE会話履歴収集（教師データ）",
    status: "inProgress",
    assignee: "VJ",
    start: [5, 14],
    end: [6, 16],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-15",
    name: "ゴールデンアンサー蓄積",
    status: "inProgress",
    assignee: "VJ",
    start: [5, 12],
    end: [7, 7],
    phase: "ep2",
    scope: "A",
  },

  // ─── EP-2: 受講後bot ── 予定 ────────────────────────────────
  {
    id: "ea-post-14",
    name: "会員サイトリンク表示",
    status: "planned",
    assignee: "VJ",
    start: [5, 30],
    end: [6, 9],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-13",
    name: "予測提案機能",
    status: "planned",
    assignee: "VJ",
    start: [6, 2],
    end: [6, 13],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-12",
    name: "個別LINE回答ドラフト生成機能",
    status: "planned",
    assignee: "VJ",
    start: [6, 9],
    end: [6, 23],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-post-16",
    name: "ログ基盤構築",
    status: "planned",
    assignee: "VJ",
    start: [6, 16],
    end: [6, 27],
    phase: "ep2",
    scope: "B",
  },
  {
    id: "ea-post-17",
    name: "受け入れテスト",
    status: "planned",
    assignee: "VJ",
    start: [6, 23],
    end: [7, 7],
    phase: "ep2",
    scope: "B",
  },

  // ─── EP-2: マイルストーン ──────────────────────────────────
  {
    id: "ea-m-post-proto",
    name: "受講後botプロトタイプ完成",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [7, 7],
    end: [7, 7],
    phase: "ep2",
    scope: "A",
  },
  {
    id: "ea-m-post-release",
    name: "受講後bot本番リリース",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [7, 21],
    end: [7, 21],
    phase: "ep2",
    scope: "B",
  },

  // ─── EP-3: ファインチューニング（3ヶ月目〜） ─────────────────
  {
    id: "ea-ft-01",
    name: "メソッド回答精度チューニング",
    status: "planned",
    assignee: "VJ",
    start: [6, 23],
    end: [7, 7],
    phase: "ep3",
    scope: "C",
  },
  {
    id: "ea-ft-02",
    name: "教師データ100件以上蓄積",
    status: "planned",
    assignee: "VJ",
    start: [7, 1],
    end: [7, 21],
    phase: "ep3",
    scope: "C",
  },
  {
    id: "ea-ft-03",
    name: "GPTファインチューニング実施",
    status: "planned",
    assignee: "VJ",
    start: [7, 21],
    end: [8, 4],
    phase: "ep3",
    scope: "C",
  },

  // ─── EP-3: マイルストーン ──────────────────────────────────
  {
    id: "ea-m-ft-done",
    name: "ファインチューニング完了",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [8, 4],
    end: [8, 4],
    phase: "ep3",
    scope: "C",
  },

  // ─── EP-4: バックオフィス自動化（将来） ────────────────────
  {
    id: "ea-bo-01",
    name: "ヒアリングシート#1〜#24 全体棚卸し",
    status: "planned",
    assignee: "VJ",
    start: [7, 1],
    end: [7, 14],
    phase: "ep4",
  },

  // ─── EP-4: マイルストーン ──────────────────────────────────
  {
    id: "ea-m-ep4-kickoff",
    name: "EP-4 バックオフィス自動化 棚卸し開始",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [7, 1],
    end: [7, 1],
    phase: "ep4",
  },
];

export const EA_TASKS: WbsTask[] = SEED.map((s) => ({
  id: s.id,
  name: s.name,
  kind: s.kind ?? "task",
  status: s.status,
  assignee: s.assignee,
  phase: s.phase,
  start: d(s.start[0], s.start[1]),
  end: d(s.end[0], s.end[1]),
  progress: STATUS_PROGRESS_DEFAULT[s.status],
  scope: s.scope,
}));
