"use client";

import { useState } from "react";

interface Pattern {
  id: string;
  label: string;
  title: string;
  description: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  scope: string[];
  inherited?: string[];
  duration: string;
  barWidths: { color: string; width: string }[];
  barLabel: string;
  recommended?: boolean;
  warning?: string;
}

const PATTERNS: Pattern[] = [
  {
    id: "a",
    label: "Pattern A",
    title: "2ヶ月以内で収まる範囲",
    description: "基本機能のみ。早期本番投入を優先",
    accent: "#5DCAA5",
    badgeBg: "#E1F5EE",
    badgeText: "#085041",
    dotColor: "#1D9E75",
    scope: [
      "スピリチュアル用語 + サロンFAQ + プロンプトでのトーン制御",
      "悩み相談・報告への自動応答（褒める → 寄り添う → アドバイス → 褒める）",
    ],
    duration: "約2ヶ月",
    barWidths: [{ color: "#1D9E75", width: "55%" }],
    barLabel: "5月 → 7月中旬",
    warning:
      "「内容が薄い」というFBは完全には解消しきれない",
  },
  {
    id: "b",
    label: "Pattern B",
    title: "動画取り込みを含める場合",
    description: "カリキュラム内容まで回答可能に。品質と期間のバランス",
    accent: "#85B7EB",
    badgeBg: "#E6F1FB",
    badgeText: "#0C447C",
    dotColor: "#378ADD",
    inherited: ["Pattern A の全機能"],
    scope: [
      "講座動画600本のトランスクリプト取り込み（選定含め）",
      "カリキュラムの中身まで回答可能に",
    ],
    duration: "2ヶ月 + 2〜3週間",
    barWidths: [
      { color: "#1D9E75", width: "55%" },
      { color: "#378ADD", width: "15%" },
    ],
    barLabel: "5月 → 8月上旬",
    recommended: true,
  },
  {
    id: "c",
    label: "Pattern C",
    title: "ファインチューニングまで含める場合",
    description: "由加先生のトーン・人格を再現した完全自動化",
    accent: "#ED93B1",
    badgeBg: "#FBEAF0",
    badgeText: "#72243E",
    dotColor: "#D4537E",
    inherited: ["Pattern A の全機能", "Pattern B の動画取り込み"],
    scope: [
      "UTAGEの会話履歴から教師データ100件以上収集",
      "ファインチューニングで由加先生の人格を再現",
      "ゴールデンアンサーによる回答品質の安定化",
    ],
    duration: "3ヶ月以上",
    barWidths: [
      { color: "#1D9E75", width: "55%" },
      { color: "#378ADD", width: "15%" },
      { color: "#D4537E", width: "18%" },
    ],
    barLabel: "5月 → 8月末〜",
  },
];

export function ScopeProposal() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#E5E5EA]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-[#F2F2F7] px-6 py-2 text-left text-xs font-medium text-[#8E8E93] transition hover:bg-[#E5E5EA]"
      >
        <span
          className="inline-block text-[10px] transition-transform"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          ▼
        </span>
        講座Bot スコープ提案（Pattern A / B / C）
      </button>

      {open && (
        <div className="bg-white px-6 py-4">
          <div className="grid gap-3 lg:grid-cols-3">
            {PATTERNS.map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern: p }: { pattern: Pattern }) {
  return (
    <div
      className="rounded-xl border border-[#E5E5EA] bg-white"
      style={{ borderLeftWidth: 3, borderLeftColor: p.accent }}
    >
      <div className="px-4 py-3">
        {/* Header */}
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className="inline-block rounded-md px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: p.badgeBg, color: p.badgeText }}
          >
            {p.label}
          </span>
          {/* {p.recommended && (
            <span className="inline-block rounded-md bg-[#EAF3DE] px-2 py-0.5 text-[11px] font-medium text-[#27500A]">
              ✓ 推奨
            </span>
          )} */}
        </div>
        <h3 className="text-[14px] font-semibold text-[#1C1C1E]">
          {p.title}
        </h3>
        <p className="mt-0.5 text-[11px] text-[#8E8E93]">{p.description}</p>

        {/* Scope items */}
        <div className="mt-3 space-y-1">
          {p.inherited?.map((item, i) => (
            <div
              key={`inh-${i}`}
              className="flex items-baseline gap-2 text-[12px] text-[#8E8E93]"
            >
              <span
                className="mt-[5px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                style={{ backgroundColor: "#C7C7CC" }}
              />
              {item}
            </div>
          ))}
          {p.scope.map((item, i) => (
            <div
              key={`scope-${i}`}
              className="flex items-baseline gap-2 text-[12px] text-[#1C1C1E]"
            >
              <span
                className="mt-[5px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                style={{ backgroundColor: p.dotColor }}
              />
              {item}
            </div>
          ))}
        </div>

        {/* Duration */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-[#8E8E93]">期間</span>
          <span className="text-[14px] font-semibold text-[#1C1C1E]">
            {p.duration}
          </span>
        </div>

        {/* Bar */}
        <div className="mt-2 flex items-center gap-2">
          {p.barWidths.map((bar, i) => (
            <div
              key={`bar-${i}`}
              className="h-[5px] shrink-0 rounded-full"
              style={{ width: bar.width, backgroundColor: bar.color }}
            />
          ))}
          <span className="whitespace-nowrap text-[10px] text-[#8E8E93]">
            {p.barLabel}
          </span>
        </div>

        {/* Warning */}
        {p.warning && (
          <div className="mt-2 rounded-lg bg-[#FFF3E0] px-2.5 py-1.5 text-[11px] text-[#CC7700]">
            ⚠ {p.warning}
          </div>
        )}
      </div>
    </div>
  );
}
