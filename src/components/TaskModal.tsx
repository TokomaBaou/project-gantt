"use client";

import { useEffect, useState } from "react";
import { STATUS_COLORS } from "@/lib/statusColors";
import {
  STATUS_LABELS,
  type PhaseMeta,
  type TaskStatus,
  type WbsTask,
} from "@/types/wbs";

interface TaskModalProps {
  task: WbsTask | null;
  assignees: string[];
  phases: PhaseMeta[];
  canEdit: boolean;
  onClose: () => void;
  onSave: (updated: WbsTask) => void;
}

const STATUS_KEYS: TaskStatus[] = [
  "done",
  "inProgress",
  "waiting",
  "planned",
  "new",
];

const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  done: "bg-[#E5F1FF] text-[#007AFF]",
  inProgress: "bg-[#E8F9ED] text-[#28A745]",
  waiting: "bg-[#F2F2F7] text-[#8E8E93]",
  planned: "bg-[#EDEDFC] text-[#5856D6]",
  new: "bg-[#FFF3E0] text-[#E65100]",
};

export function TaskModal({
  task,
  assignees,
  phases,
  canEdit,
  onClose,
  onSave,
}: TaskModalProps) {
  const [status, setStatus] = useState<TaskStatus>("planned");
  const [assignee, setAssignee] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setAssignee(task.assignee);
      setProgress(task.progress);
      setIsEditing(false);
    }
  }, [task]);

  if (!task) {
    return null;
  }

  const handleSave = () => {
    onSave({
      ...task,
      status,
      assignee,
      progress,
    });
  };

  const color = STATUS_COLORS[status];
  const phaseMeta = phases.find((p) => p.id === task.phase);
  const durationDays = calcDays(task.start, task.end);
  const isMilestone = task.kind === "milestone";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="px-6 py-5 text-white"
          style={{ backgroundColor: color.background }}
        >
          <div className="flex items-start gap-2">
            {isMilestone && (
              <span
                aria-hidden
                className="mt-1 inline-block h-3.5 w-3.5 shrink-0 rotate-45 bg-white/80"
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold leading-snug">
                {task.name}
              </h2>
              {phaseMeta && (
                <p className="mt-0.5 text-xs font-medium opacity-80">
                  {phaseMeta.label}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Detail section ── */}
        <div className="space-y-4 px-6 py-5">
          {/* Schedule row */}
          <div className="grid grid-cols-3 gap-3">
            <InfoCard
              label="開始"
              value={formatDate(task.start)}
            />
            <InfoCard
              label="終了"
              value={formatDate(task.end)}
            />
            <InfoCard
              label={isMilestone ? "種別" : "期間"}
              value={isMilestone ? "マイルストーン" : `${durationDays}日間`}
            />
          </div>

          {/* Progress bar (tasks only) */}
          {!isMilestone && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-[#8E8E93]">進捗率</span>
                <span className="font-semibold text-[#1C1C1E]">
                  {isEditing ? progress : task.progress}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#F2F2F7]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${isEditing ? progress : task.progress}%`,
                    backgroundColor: color.progress,
                  }}
                />
              </div>
            </div>
          )}

          {/* Status & Assignee (read-only view) */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#E5E5EA] px-3 py-2.5">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#8E8E93]">
                  ステータス
                </div>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASSES[task.status]}`}
                >
                  {STATUS_LABELS[task.status]}
                </span>
              </div>
              <div className="rounded-xl border border-[#E5E5EA] px-3 py-2.5">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#8E8E93]">
                  担当
                </div>
                <span className="text-sm font-medium text-[#1C1C1E]">
                  {task.assignee || "—"}
                </span>
              </div>
            </div>
          )}

          {/* Edit form (shown when editing) */}
          {isEditing && (
            <div className="space-y-3 rounded-xl border border-[#007AFF]/20 bg-[#F8FAFF] p-4">
              <Field label="ステータス">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-sm text-[#1C1C1E] transition focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                >
                  {STATUS_KEYS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="担当">
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-sm text-[#1C1C1E] transition focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                >
                  {Array.from(new Set([assignee, ...assignees])).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>

              {!isMilestone && (
                <Field label={`進捗率: ${progress}%`}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full accent-[#007AFF]"
                  />
                </Field>
              )}
            </div>
          )}

          {/* Meta info */}
          {phaseMeta?.goal && (
            <div className="rounded-xl bg-[#F2F2F7] px-3 py-2.5 text-xs">
              <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-[#8E8E93]">
                フェーズ目標
              </div>
              <div className="text-[#1C1C1E]">{phaseMeta.goal}</div>
            </div>
          )}

          <div className="flex items-center gap-3 text-[11px] text-[#C7C7CC]">
            <span>ID: {task.id}</span>
            <span>Phase: {task.phase}</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 border-t border-[#E5E5EA] bg-[#F2F2F7] px-6 py-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setStatus(task.status);
                  setAssignee(task.assignee);
                  setProgress(task.progress);
                  setIsEditing(false);
                }}
                className="rounded-lg border border-[#E5E5EA] bg-white px-4 py-1.5 text-sm font-medium text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-[#007AFF] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0051D5]"
              >
                保存
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#E5E5EA] bg-white px-4 py-1.5 text-sm font-medium text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
              >
                閉じる
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg bg-[#007AFF] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0051D5]"
                >
                  編集
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E5EA] px-3 py-2.5 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[#8E8E93]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-[#1C1C1E]">
        {value}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[#8E8E93]">
        {label}
      </label>
      {children}
    </div>
  );
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dow = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${y}/${m}/${d}（${dow}）`;
}

function calcDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}
