"use client";

import { useEffect, useState } from "react";
import { STATUS_COLORS } from "@/lib/statusColors";
import { STATUS_LABELS, type TaskStatus, type WbsTask } from "@/types/wbs";

interface TaskModalProps {
  task: WbsTask | null;
  assignees: string[];
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

export function TaskModal({
  task,
  assignees,
  onClose,
  onSave,
}: TaskModalProps) {
  const [status, setStatus] = useState<TaskStatus>("planned");
  const [assignee, setAssignee] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setAssignee(task.assignee);
      setProgress(task.progress);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-5 text-white"
          style={{ backgroundColor: color.background }}
        >
          <h2 className="text-lg font-semibold">{task.name}</h2>
          <p className="mt-1 text-xs opacity-90">
            {formatDate(task.start)} 〜 {formatDate(task.end)}
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
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

          <div className="rounded-xl bg-[#F2F2F7] px-3 py-2 text-xs text-[#8E8E93]">
            <div>Phase: {task.phase}</div>
            <div>ID: {task.id}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E5E5EA] bg-[#F2F2F7] px-6 py-3">
          <button
            type="button"
            onClick={onClose}
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
        </div>
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
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
