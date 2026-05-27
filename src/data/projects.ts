import type { PhaseMeta, ProjectMeta } from "@/types/wbs";

const EA_PHASES: PhaseMeta[] = [
  {
    id: "ep1",
    label: "受講後bot: Web版 開発・リリース",
    goal: "最優先。α版: 6/22（基本応答・FBは随時反映）/ β版: 7/6（機能追加）",
  },
  {
    id: "ep2",
    label: "受講後bot: LINE版 リリース",
    goal: "LINE版リリース目標: 7月中旬",
  },
  {
    id: "ep3",
    label: "受講後bot: 運用・精度改善",
    goal: "メソッド精度・ファインチューニング・LLM最適化（〜9月末）",
  },
  {
    id: "ep4",
    label: "受講前bot",
    goal: "後回し。受講後bot後に着手、7月下旬〜8月下旬",
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
    description: "AI効率化PoC — 受講後bot（Web/LINE/運用改善）・受講前bot",
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
