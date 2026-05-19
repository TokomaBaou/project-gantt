import { STATUS_PROGRESS_DEFAULT } from "@/lib/statusColors";
import type { TaskKind, TaskStatus, WbsTask } from "@/types/wbs";

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
}

const SEED: SeedTask[] = [
  // Phase 1: FAQ bot
  {
    id: "ea-p1-01",
    name: "サロンFAQ取り込み",
    status: "done",
    assignee: "VJ",
    start: [5, 5],
    end: [5, 9],
    phase: "phase1",
  },
  {
    id: "ea-p1-02",
    name: "Agentic RAG実装",
    status: "done",
    assignee: "VJ",
    start: [5, 8],
    end: [5, 12],
    phase: "phase1",
  },
  {
    id: "ea-p1-03",
    name: "ネガティブ検知+Slack通知",
    status: "done",
    assignee: "VJ",
    start: [5, 12],
    end: [5, 12],
    phase: "phase1",
  },
  {
    id: "ea-p1-04",
    name: "短文回答",
    status: "done",
    assignee: "VJ",
    start: [5, 12],
    end: [5, 12],
    phase: "phase1",
  },
  {
    id: "ea-p1-05",
    name: "FAQ回答精度チューニング",
    status: "done",
    assignee: "VJ",
    start: [5, 12],
    end: [5, 14],
    phase: "phase1",
  },
  {
    id: "ea-p1-06",
    name: "デプロイ",
    status: "done",
    assignee: "VJ",
    start: [5, 9],
    end: [5, 9],
    phase: "phase1",
  },
  {
    id: "ea-p1-07",
    name: "用語辞典212語Embedding検索",
    status: "inProgress",
    assignee: "VJ",
    start: [5, 13],
    end: [5, 19],
    phase: "phase1",
  },
  {
    id: "ea-p1-08",
    name: "用語辞典スプシFB反映",
    status: "waiting",
    assignee: "EA",
    start: [5, 12],
    end: [5, 26],
    phase: "phase1",
  },
  {
    id: "ea-p1-09",
    name: "会員サイトコンテンツ取り込み",
    status: "new",
    assignee: "VJ/EA",
    start: [5, 26],
    end: [6, 9],
    phase: "phase1",
  },
  {
    id: "ea-p1-10",
    name: "予測提案機能",
    status: "new",
    assignee: "VJ",
    start: [6, 2],
    end: [6, 13],
    phase: "phase1",
  },
  {
    id: "ea-p1-11",
    name: "会員サイトリンク表示",
    status: "new",
    assignee: "VJ",
    start: [5, 30],
    end: [6, 9],
    phase: "phase1",
  },
  {
    id: "ea-p1-12",
    name: "入会前FAQ取り込み",
    status: "planned",
    assignee: "VJ",
    start: [5, 26],
    end: [6, 2],
    phase: "phase1",
  },
  {
    id: "ea-p1-13",
    name: "LINE組み込み",
    status: "planned",
    assignee: "VJ",
    start: [6, 16],
    end: [6, 30],
    phase: "phase1",
  },
  {
    id: "ea-p1-14",
    name: "ログ基盤構築",
    status: "planned",
    assignee: "VJ",
    start: [6, 16],
    end: [6, 27],
    phase: "phase1",
  },

  // Phase 2: メソッド回答bot
  {
    id: "ea-p2-01",
    name: "UTAGE回答履歴収集",
    status: "inProgress",
    assignee: "VJ",
    start: [5, 14],
    end: [6, 2],
    phase: "phase2",
  },
  {
    id: "ea-p2-02",
    name: "ゴールデンアンサー蓄積",
    status: "inProgress",
    assignee: "VJ",
    start: [5, 12],
    end: [7, 7],
    phase: "phase2",
  },
  {
    id: "ea-p2-03",
    name: "メソッド回答精度チューニング",
    status: "planned",
    assignee: "VJ",
    start: [6, 23],
    end: [7, 7],
    phase: "phase2",
  },

  // Phase 3: ファインチューニング
  {
    id: "ea-p3-01",
    name: "教師データ100件以上蓄積",
    status: "planned",
    assignee: "VJ",
    start: [7, 1],
    end: [7, 21],
    phase: "phase3",
  },
  {
    id: "ea-p3-02",
    name: "GPTファインチューニング実施",
    status: "planned",
    assignee: "VJ",
    start: [7, 21],
    end: [8, 4],
    phase: "phase3",
  },

  // Milestones
  {
    id: "ea-m-p1-release",
    name: "Phase 1 FAQ bot 本番リリース",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [6, 30],
    end: [6, 30],
    phase: "phase1",
  },
  {
    id: "ea-m-p2-v1",
    name: "Phase 2 メソッド回答 初版完成",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [7, 31],
    end: [7, 31],
    phase: "phase2",
  },
  {
    id: "ea-m-p3-start",
    name: "Phase 3 ファインチューニング開始",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [8, 1],
    end: [8, 1],
    phase: "phase3",
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
}));
