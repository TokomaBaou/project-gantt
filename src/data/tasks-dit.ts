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
  // Phase 1: 要件定義・設計（仮データ）
  {
    id: "dit-p1-01",
    name: "要件ヒアリング",
    status: "inProgress",
    assignee: "VJ",
    start: [5, 15],
    end: [5, 30],
    phase: "phase1",
  },
  {
    id: "dit-p1-02",
    name: "アーキテクチャ設計",
    status: "planned",
    assignee: "VJ",
    start: [6, 1],
    end: [6, 20],
    phase: "phase1",
  },

  // Milestones（仮）
  {
    id: "dit-m-kickoff",
    name: "キックオフ完了",
    kind: "milestone",
    status: "done",
    assignee: "VJ",
    start: [5, 14],
    end: [5, 14],
    phase: "phase1",
  },
  {
    id: "dit-m-requirements",
    name: "要件定義完了",
    kind: "milestone",
    status: "planned",
    assignee: "VJ",
    start: [6, 30],
    end: [6, 30],
    phase: "phase1",
  },
];

export const DIT_TASKS: WbsTask[] = SEED.map((s) => ({
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
