"use client";

import { STATUS_LABELS, type PhaseMeta, type TaskStatus } from "@/types/wbs";

export type ZoomMode = "week" | "month" | "year";
export type PhaseFilter = "all" | string;
export type AssigneeFilter = string;
export type StatusFilter = "all" | "notDone" | TaskStatus;
export type ScopeFilter = "all" | "A" | "B" | "C";

interface ToolbarProps {
  zoom: ZoomMode;
  onZoomChange: (zoom: ZoomMode) => void;
  onFitToView?: () => void;
  phases: PhaseMeta[];
  phaseFilter: PhaseFilter;
  onPhaseFilterChange: (value: PhaseFilter) => void;
  assigneeFilter: AssigneeFilter;
  onAssigneeFilterChange: (value: AssigneeFilter) => void;
  assignees: string[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  scopeFilter: ScopeFilter;
  onScopeFilterChange: (value: ScopeFilter) => void;
  showScopeFilter?: boolean;
  readOnly?: boolean;
}

const ZOOM_OPTIONS: { value: ZoomMode; label: string }[] = [
  { value: "week", label: "週" },
  { value: "month", label: "月" },
  { value: "year", label: "年" },
];

const STATUS_KEYS: TaskStatus[] = [
  "done",
  "inProgress",
  "waiting",
  "planned",
  "new",
];

const SCOPE_OPTIONS: { value: ScopeFilter; label: string; hint: string }[] = [
  { value: "all", label: "すべて", hint: "" },
  { value: "A", label: "パターンA", hint: "2ヶ月以内" },
  { value: "B", label: "パターンB", hint: "2ヶ月+2〜3週間" },
  { value: "C", label: "パターンC", hint: "3ヶ月以上" },
];

export function Toolbar({
  zoom,
  onZoomChange,
  onFitToView,
  phases,
  phaseFilter,
  onPhaseFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  assignees,
  statusFilter,
  onStatusFilterChange,
  scopeFilter,
  onScopeFilterChange,
  showScopeFilter,
  readOnly,
}: ToolbarProps) {
  const scopeHint =
    SCOPE_OPTIONS.find((o) => o.value === scopeFilter)?.hint ?? "";
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-[#E5E5EA] bg-white px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#8E8E93]">ズーム</span>
        <div className="inline-flex overflow-hidden rounded-lg bg-[#F2F2F7] p-0.5">
          {ZOOM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onZoomChange(opt.value)}
              className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
                zoom === opt.value
                  ? "bg-white text-[#007AFF] shadow-sm"
                  : "text-[#8E8E93] hover:text-[#1C1C1E]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {onFitToView && (
          <button
            type="button"
            onClick={onFitToView}
            title="ガントチャート全体を画面幅に収めて表示"
            className="rounded-lg border border-[#E5E5EA] bg-white px-2.5 py-1 text-sm font-medium text-[#1C1C1E] transition hover:bg-[#F2F2F7] active:bg-[#E5E5EA]"
          >
            全体表示
          </button>
        )}
      </div>

      <FilterSelect
        label="Phase"
        value={phaseFilter}
        onChange={(v) => onPhaseFilterChange(v as PhaseFilter)}
      >
        <option value="all">すべて</option>
        {phases.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="担当"
        value={assigneeFilter}
        onChange={(v) => onAssigneeFilterChange(v)}
      >
        <option value="all">すべて</option>
        {assignees.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="ステータス"
        value={statusFilter}
        onChange={(v) => onStatusFilterChange(v as StatusFilter)}
      >
        <option value="all">すべて</option>
        <option value="notDone">完了以外</option>
        {STATUS_KEYS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </FilterSelect>

      {showScopeFilter && (
        <div className="flex items-center gap-2">
          <FilterSelect
            label="スコープ"
            value={scopeFilter}
            onChange={(v) => onScopeFilterChange(v as ScopeFilter)}
          >
            {SCOPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </FilterSelect>
          {scopeHint && (
            <span className="text-xs text-[#C7C7CC]">{scopeHint}</span>
          )}
        </div>
      )}

      {readOnly && (
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#F2F2F7] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#8E8E93]" />
          閲覧モード
        </span>
      )}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function FilterSelect({ label, value, onChange, children }: FilterSelectProps) {
  const isActive = value !== "all";
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-[#8E8E93]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border bg-white px-2.5 py-1.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 ${
          isActive
            ? "border-[#007AFF]/40 bg-[#E5F1FF] text-[#007AFF]"
            : "border-[#E5E5EA] text-[#1C1C1E] hover:bg-[#F2F2F7]"
        }`}
      >
        {children}
      </select>
    </label>
  );
}
