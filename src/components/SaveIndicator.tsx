"use client";

import type { SaveStatus } from "@/lib/useAutoSave";

interface SaveIndicatorProps {
  status: SaveStatus;
  pendingCount: number;
  onRetry: () => void;
}

export function SaveIndicator({
  status,
  pendingCount,
  onRetry,
}: SaveIndicatorProps) {
  if (status === "idle") {
    return <div className="h-5" aria-hidden />;
  }

  if (status === "dirty") {
    return (
      <Wrapper className="text-[#FF9500]">
        <span className="inline-block h-2 w-2 rounded-full bg-[#FF9500]" />
        <span className="text-[#1C1C1E]">
          未保存の変更
          {pendingCount > 1 ? `（${pendingCount}件）` : ""}
        </span>
      </Wrapper>
    );
  }

  if (status === "saving") {
    return (
      <Wrapper className="text-[#8E8E93]">
        <Spinner />
        <span>保存中…</span>
      </Wrapper>
    );
  }

  if (status === "saved") {
    return (
      <Wrapper className="text-[#34C759] transition-opacity duration-500">
        <CheckIcon />
        <span>保存済み</span>
      </Wrapper>
    );
  }

  return (
    <Wrapper className="text-[#FF3B30]">
      <span className="inline-block h-2 w-2 rounded-full bg-[#FF3B30]" />
      <span>保存失敗</span>
      <button
        type="button"
        onClick={onRetry}
        className="ml-1 rounded-md border border-[#FF3B30]/30 bg-white px-2 py-0.5 text-[11px] font-medium text-[#FF3B30] transition hover:bg-[#FFE5E5]"
      >
        リトライ
      </button>
    </Wrapper>
  );
}

function Wrapper({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex h-5 items-center gap-1.5 text-xs ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#8E8E93]"
    />
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 7.5l3 3 6-7" />
    </svg>
  );
}
