import type { PhaseMeta, ProjectMeta } from "@/types/wbs";

const EA_PHASES: PhaseMeta[] = [
  {
    id: "ep1",
    label: "EP-1: 事務QAボット",
    goal: "本番リリース目標: 6月末（~50h）",
  },
  {
    id: "ep3",
    label: "EP-3: 講座ボット",
    goal: "EP-1と並行。動画8本RAG（~6h）",
  },
  {
    id: "ep2",
    label: "EP-2: バックオフィス自動化",
    goal: "EP-1完了後に全体棚卸し（7月〜）",
  },
];

const DIT_PHASES: PhaseMeta[] = [
  {
    id: "phase1",
    label: "Phase 1: 要件定義・設計",
    goal: "要件定義完了目標: 6月末",
  },
];

export const PROJECTS: ProjectMeta[] = [
  {
    slug: "ea",
    name: "Enlight Academy",
    description: "AI効率化PoC — 事務QAボット・講座ボット・バックオフィス自動化",
    phases: EA_PHASES,
    notionProjectNames: ["Enlight Academy"],
    hearingStartDate: "2026-04-24",
  },
  {
    slug: "dit",
    name: "DIT",
    description: "AI Server構築プロジェクト",
    phases: DIT_PHASES,
    notionProjectNames: ["DIT"],
  },
];

export function getProject(slug: string): ProjectMeta | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
