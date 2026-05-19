"use client";

import { STATUS_LABELS, type PhaseMeta, type TaskStatus } from "@/types/wbs";

export type ZoomMode = "week" | "month";
export type PhaseFilter = "all" | string;
export type AssigneeFilter = string;
export type StatusFilter = "all" | TaskStatus;

interface ToolbarProps {
  zoom: ZoomMode;
  onZoomChange: (zoom: ZoomMode) => void;
  phases: PhaseMeta[];
  phaseFilter: PhaseFilter;
  onPhaseFilterChange: (value: PhaseFilter) => void;
  assigneeFilter: AssigneeFilter;
  onAssigneeFilterChange: (value: AssigneeFilter) => void;
  assignees: string[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
}

const STATUS_KEYS: TaskStatus[] = [
  "done",
  "inProgress",
  "waiting",
  "planned",
  "new",
];

export function Toolbar({
  zoom,
  onZoomChange,
  phases,
  phaseFilter,
  onPhaseFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  assignees,
  statusFilter,
  onStatusFilterChange,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-[#E5E5EA] bg-white px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#8E8E93]">ズーム</span>
        <div className="inline-flex overflow-hidden rounded-lg bg-[#F2F2F7] p-0.5">
          <button
            type="button"
            onClick={() => onZoomChange("week")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              zoom === "week"
                ? "bg-white text-[#007AFF] shadow-sm"
                : "text-[#8E8E93] hover:text-[#1C1C1E]"
            }`}
          >
            週
          </button>
          <button
            type="button"
            onClick={() => onZoomChange("month")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              zoom === "month"
                ? "bg-white text-[#007AFF] shadow-sm"
                : "text-[#8E8E93] hover:text-[#1C1C1E]"
            }`}
          >
            月
          </button>
        </div>
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
        {STATUS_KEYS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </FilterSelect>
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
