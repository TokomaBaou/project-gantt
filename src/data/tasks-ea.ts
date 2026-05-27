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
  // ═══════════════════════════════════════════════════════════════════
  // EP-1: 受講後bot Web版 開発・リリース（最優先・4/24〜6/20）
  // ═══════════════════════════════════════════════════════════════════

  // ─── Epic: Web版初期リリース（基盤構築）4/24〜5/14 ✅完了 ───
  {
    id: "ea-web-init-01",
    name: "サロンFAQ取込み",
    status: "done",
    assignee: "VJ",
    start: [4, 24],
    end: [5, 9],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-init-02",
    name: "FAQ回答精度チューニング",
    status: "done",
    assignee: "VJ",
    start: [5, 12],
    end: [5, 14],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-init-03",
    name: "Agentic RAG実装",
    status: "done",
    assignee: "VJ",
    start: [4, 24],
    end: [5, 14],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-init-04",
    name: "ネガティブ検知+Slack通知",
    status: "done",
    assignee: "VJ",
    start: [4, 24],
    end: [5, 14],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-init-05",
    name: "短文回答対応",
    status: "done",
    assignee: "VJ",
    start: [4, 24],
    end: [5, 14],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-init-06",
    name: "デプロイ（Railway + Vercel）",
    status: "done",
    assignee: "VJ",
    start: [4, 24],
    end: [5, 14],
    phase: "ep1",
    scope: "A",
  },

  // ─── Epic: Web版+辞書・コンテンツ拡充 5/14〜6/13 ●進行中 ───
  {
    id: "ea-web-expand-01",
    name: "用語辞典212語Embedding",
    status: "inProgress",
    assignee: "M.Oba",
    start: [5, 26],
    end: [6, 6],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-expand-02",
    name: "用語辞典スプシFB反映",
    status: "inProgress",
    assignee: "SakuraiHiroaki",
    start: [5, 26],
    end: [6, 6],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-expand-03",
    name: "会員サイトコンテンツ取込み",
    status: "planned",
    assignee: "M.Oba",
    start: [6, 2],
    end: [6, 13],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-expand-04",
    name: "動画トランスクリプトパイプライン構築",
    status: "planned",
    assignee: "M.Oba",
    start: [6, 2],
    end: [6, 13],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-expand-05",
    name: "講座動画トランスクリプト取込み",
    status: "planned",
    assignee: "M.Oba",
    start: [6, 9],
    end: [6, 20],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-expand-06",
    name: "ゴールデンアンサー蓄積",
    status: "inProgress",
    assignee: "M.Oba",
    start: [5, 12],
    end: [7, 14],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-expand-07",
    name: "UTAGE会話履歴収集",
    status: "inProgress",
    assignee: "M.Oba",
    start: [5, 14],
    end: [6, 23],
    phase: "ep1",
    scope: "A",
  },

  // ─── Epic: Web版+レコメンド・導線強化 6/2〜6/20 ───
  {
    id: "ea-web-rec-01",
    name: "予測提案機能",
    status: "planned",
    assignee: "SakuraiHiroaki",
    start: [6, 2],
    end: [6, 13],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-web-rec-02",
    name: "会員サイトリンク表示",
    status: "planned",
    assignee: "SakuraiHiroaki",
    start: [6, 9],
    end: [6, 20],
    phase: "ep1",
    scope: "A",
  },

  // ─── EP-1: マイルストーン（リリースポイント） ───
  {
    id: "ea-m-web-alpha",
    name: "Web版 α版リリース（リリースポイント）",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [6, 22],
    end: [6, 22],
    phase: "ep1",
    scope: "A",
  },
  {
    id: "ea-m-web-beta",
    name: "Web版 β版リリース（FB反映）",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [7, 6],
    end: [7, 6],
    phase: "ep1",
    scope: "A",
  },

  // ═══════════════════════════════════════════════════════════════════
  // EP-2: 受講後bot LINE版 リリース（6/16〜7/18）
  // ═══════════════════════════════════════════════════════════════════

  // ─── Epic: LINE版リリース ───
  {
    id: "ea-line-01",
    name: "LINE組込み（中間サーバー方式）",
    status: "planned",
    assignee: "M.Oba",
    start: [6, 23],
    end: [7, 11],
    phase: "ep2",
    scope: "B",
  },
  {
    id: "ea-line-02",
    name: "ログ基盤構築",
    status: "planned",
    assignee: "SakuraiHiroaki",
    start: [6, 23],
    end: [7, 4],
    phase: "ep2",
    scope: "B",
  },
  {
    id: "ea-line-03",
    name: "文字数・絵文字調整",
    status: "planned",
    assignee: "M.Oba",
    start: [7, 14],
    end: [7, 25],
    phase: "ep2",
    scope: "B",
  },
  {
    id: "ea-line-04",
    name: "受け入れテスト",
    status: "planned",
    assignee: "SakuraiHiroaki",
    start: [7, 21],
    end: [7, 31],
    phase: "ep2",
    scope: "B",
  },

  // ─── EP-2: マイルストーン ───
  {
    id: "ea-m-line-release",
    name: "LINE版リリース（リリースポイント）",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [7, 31],
    end: [7, 31],
    phase: "ep2",
    scope: "B",
  },

  // ═══════════════════════════════════════════════════════════════════
  // EP-3: 受講後bot 運用・精度改善（7/21〜9/30）
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "ea-ops-01",
    name: "メソッド回答精度チューニング",
    status: "planned",
    assignee: "VJ",
    start: [8, 4],
    end: [8, 22],
    phase: "ep3",
    scope: "C",
  },
  {
    id: "ea-ops-02",
    name: "教師データ100件以上蓄積",
    status: "planned",
    assignee: "VJ",
    start: [7, 21],
    end: [8, 8],
    phase: "ep3",
    scope: "C",
  },
  {
    id: "ea-ops-03",
    name: "GPTファインチューニング実施",
    status: "planned",
    assignee: "VJ",
    start: [8, 25],
    end: [9, 12],
    phase: "ep3",
    scope: "C",
  },
  {
    id: "ea-ops-04",
    name: "LLM使い分け最適化",
    status: "planned",
    assignee: "VJ",
    start: [8, 25],
    end: [9, 30],
    phase: "ep3",
    scope: "C",
  },

  // ═══════════════════════════════════════════════════════════════════
  // EP-4: 受講前bot（後回し・7/21〜8/22）
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "ea-pre-01",
    name: "入会前FAQ検索統合",
    status: "planned",
    assignee: "VJ",
    start: [8, 4],
    end: [8, 15],
    phase: "ep4",
    scope: "C",
  },
  {
    id: "ea-pre-02",
    name: "入会前/後の判別方式設計",
    status: "planned",
    assignee: "VJ",
    start: [8, 4],
    end: [8, 22],
    phase: "ep4",
    scope: "C",
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
