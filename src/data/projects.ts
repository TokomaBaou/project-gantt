import type { PhaseMeta, ProjectMeta } from "@/types/wbs";

const EA_PHASES: PhaseMeta[] = [
  { id: "phase1", label: "Phase 1: FAQ bot", goal: "本番リリース目標: 6月末" },
  { id: "phase2", label: "Phase 2: メソッド回答", goal: "初版完成目標: 7月末" },
  {
    id: "phase3",
    label: "Phase 3: ファインチューニング",
    goal: "学習開始: 8月初旬",
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
    description: "スピリチュアルサロン FAQチャットボット構築",
    phases: EA_PHASES,
    notionProjectNames: ["EA", "Enlight Academy"],
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
