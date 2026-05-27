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
    label: "Phase 1",
    title: "（〜6月末）｜Web版α・β版リリース",
    description: "先方がWeb版で触ってFBできる状態まで",
    accent: "#5DCAA5",
    badgeBg: "#E1F5EE",
    badgeText: "#085041",
    dotColor: "#1D9E75",
    scope: [
      "Web版 α版・β版リリース",
      "FAQ 45件 + 用語辞典212語 + 会員サイトコンテンツ取込み",
      "動画トランスクリプト（主要コース分）",
      "予測提案機能 + 会員サイトリンク表示",
    ],
    duration: "2ヶ月（〜6月末）",
    barWidths: [{ color: "#1D9E75", width: "40%" }],
    barLabel: "5月 → 6月末",
  },
  {
    id: "b",
    label: "Phase 2",
    title: "（〜7月末）｜LINE版リリース",
    description: "LINEで会員が実際に使える状態まで",
    accent: "#85B7EB",
    badgeBg: "#E6F1FB",
    badgeText: "#0C447C",
    dotColor: "#378ADD",
    inherited: ["Phase 1 の全機能"],
    scope: [
      "LINE組込み（中間サーバー方式）",
      "ログ基盤構築",
      "文字数・絵文字最適化",
      "受け入れテスト",
    ],
    duration: "3ヶ月（〜7月末）",
    barWidths: [
      { color: "#1D9E75", width: "40%" },
      { color: "#378ADD", width: "20%" },
    ],
    barLabel: "5月 → 7月末",
    recommended: true,
  },
  {
    id: "c",
    label: "Phase 3",
    title: "（〜9月末）｜運用・精度改善＋受講前bot",
    description: "ゆかさんの口調再現、全コンテンツ対応の最高品質",
    accent: "#ED93B1",
    badgeBg: "#FBEAF0",
    badgeText: "#72243E",
    dotColor: "#D4537E",
    inherited: ["Phase 1 の全機能", "Phase 2 の LINE版リリース"],
    scope: [
      "メソッド回答精度チューニング",
      "GPTファインチューニング",
      "LLM使い分け最適化",
      "受講前bot（入会前FAQ・判別方式）",
    ],
    duration: "5ヶ月（〜9月末）",
    barWidths: [
      { color: "#1D9E75", width: "40%" },
      { color: "#378ADD", width: "20%" },
      { color: "#D4537E", width: "40%" },
    ],
    barLabel: "5月 → 9月末",
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
        スコープ提案（Phase 1 / 2 / 3）
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
        <h3 className="text-[14px] font-semibold text-[#1C1C1E]">{p.title}</h3>
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
