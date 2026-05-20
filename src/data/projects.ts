import type { PhaseMeta, ProjectMeta } from "@/types/wbs";

const EA_PHASES: PhaseMeta[] = [
  {
    id: "ep1",
    label: "受講前bot",
    goal: "本番リリース目標: 6月下旬",
  },
  {
    id: "ep2",
    label: "受講後bot",
    goal: "プロトタイプ完成: 7月上旬",
  },
  {
    id: "ep3",
    label: "ファインチューニング",
    goal: "完了目標: 8月上旬",
  },
  {
    id: "ep4",
    label: "バックオフィス自動化",
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
    description:
      "AI効率化PoC — 受講前bot・受講後bot・ファインチューニング・バックオフィス自動化",
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
