"use client";

import { useCallback, useMemo, useState, type FC } from "react";
import { Gantt, type Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { STATUS_COLORS } from "@/lib/statusColors";
import {
  STATUS_LABELS,
  type PhaseMeta,
  type TaskStatus,
  type WbsTask,
} from "@/types/wbs";
import type { ZoomMode } from "./Toolbar";

interface GanttChartProps {
  tasks: WbsTask[];
  phases: PhaseMeta[];
  zoom: ZoomMode;
  readOnly: boolean;
  onTaskClick: (task: WbsTask) => void;
  onDateChange: (id: string, start: Date, end: Date) => void;
}

const PHASE_ACCENT_COLORS = ["#007AFF", "#34C759", "#FF9500", "#AF52DE"];

const MILESTONE_COLOR = "#AF52DE";

const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  done: "bg-[#E5F1FF] text-[#007AFF]",
  inProgress: "bg-[#E8F9ED] text-[#28A745]",
  waiting: "bg-[#F2F2F7] text-[#8E8E93]",
  planned: "bg-[#EDEDFC] text-[#5856D6]",
  new: "bg-[#FFF3E0] text-[#E65100]",
};

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 50;
const LIST_WIDTH = "360px";

export function GanttChart({
  tasks,
  phases,
  zoom,
  readOnly,
  onTaskClick,
  onDateChange,
}: GanttChartProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggleCollapse = useCallback((phaseId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  }, []);

  const wbsById = useMemo(() => {
    const map = new Map<string, WbsTask>();
    for (const t of tasks) {
      map.set(t.id, t);
    }
    return map;
  }, [tasks]);

  const phaseIndex = useMemo(() => {
    const map = new Map<string, number>();
    phases.forEach((p, i) => map.set(p.id, i));
    return map;
  }, [phases]);

  const ganttTasks = useMemo<Task[]>(() => {
    const result: Task[] = [];

    for (const phase of phases) {
      const children = tasks.filter((t) => t.phase === phase.id);
      if (children.length === 0) {
        continue;
      }

      const minStart = new Date(
        Math.min(...children.map((t) => t.start.getTime())),
      );
      const maxEnd = new Date(
        Math.max(...children.map((t) => t.end.getTime())),
      );
      const taskOnly = children.filter((t) => t.kind === "task");
      const avgProgress =
        taskOnly.length === 0
          ? 0
          : Math.round(
              taskOnly.reduce((sum, t) => sum + t.progress, 0) /
                taskOnly.length,
            );

      const isCollapsed = collapsed.has(phase.id);

      result.push({
        id: phase.id,
        name: phase.label,
        start: minStart,
        end: ensureRange(minStart, maxEnd),
        progress: avgProgress,
        type: "project",
        hideChildren: isCollapsed,
        isDisabled: readOnly,
        styles: {
          backgroundColor: "#F2F2F7",
          backgroundSelectedColor: "#E5E5EA",
          progressColor: "#C7C7CC",
          progressSelectedColor: "#AEAEB2",
        },
      });

      for (const t of children) {
        const color = STATUS_COLORS[t.status];
        const label = formatBarLabel(t);
        if (t.kind === "milestone") {
          result.push({
            id: t.id,
            name: label,
            start: t.start,
            end: t.start,
            progress: t.progress,
            type: "milestone",
            project: phase.id,
            isDisabled: readOnly,
            styles: {
              backgroundColor: color.background,
              backgroundSelectedColor: color.progress,
              progressColor: color.progress,
              progressSelectedColor: color.progress,
            },
          });
        } else {
          result.push({
            id: t.id,
            name: label,
            start: t.start,
            end: ensureRange(t.start, t.end),
            progress: t.progress,
            type: "task",
            project: phase.id,
            isDisabled: readOnly,
            styles: {
              backgroundColor: color.background,
              backgroundSelectedColor: color.background,
              progressColor: color.progress,
              progressSelectedColor: color.progress,
            },
          });
        }
      }
    }

    return result;
  }, [tasks, phases, readOnly, collapsed]);

  const viewMode = zoom === "week" ? ViewMode.Week : ViewMode.Month;
  const columnWidth = zoom === "week" ? 90 : 240;

  const TaskListHeaderRow: FC<{
    headerHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
  }> = ({ headerHeight, rowWidth }) => (
    <div
      style={{ height: headerHeight, width: rowWidth }}
      className="flex items-center border-b border-[#E5E5EA] bg-white px-4 text-[11px] font-medium uppercase tracking-wider text-[#8E8E93]"
    >
      <div className="flex-1">タスク</div>
      <div className="w-24 text-center">ステータス</div>
      <div className="w-20 text-right">担当</div>
    </div>
  );

  const TaskListBody: FC<{
    rowHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
    locale: string;
    tasks: Task[];
    selectedTaskId: string;
    setSelectedTask: (taskId: string) => void;
    onExpanderClick: (task: Task) => void;
  }> = ({
    rowHeight,
    rowWidth,
    tasks: rows,
    selectedTaskId,
    setSelectedTask,
    onExpanderClick,
  }) => (
    <div style={{ width: rowWidth }} className="bg-white">
      {rows.map((row) => {
        if (row.type === "project") {
          const meta = phases.find((p) => p.id === row.id);
          const accent =
            PHASE_ACCENT_COLORS[
              (phaseIndex.get(row.id) ?? 0) % PHASE_ACCENT_COLORS.length
            ];
          const isCollapsed = collapsed.has(row.id);
          return (
            <div
              key={row.id}
              style={{
                height: rowHeight,
                borderLeftColor: accent,
                borderLeftWidth: 4,
                backgroundColor: "#F2F2F7",
              }}
              className="flex cursor-pointer items-center border-b border-l-4 border-[#E5E5EA] pl-3 pr-4 transition hover:bg-[#E5E5EA]"
              onClick={() => {
                toggleCollapse(row.id);
                onExpanderClick(row);
              }}
            >
              <span
                className="mr-2 inline-block text-[11px] text-[#8E8E93] transition-transform"
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                }}
              >
                ▼
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-[#1C1C1E]">
                  {meta?.label ?? row.name}
                </span>
                {meta?.goal && (
                  <span className="text-[11px] text-[#8E8E93]">
                    （{meta.goal}）
                  </span>
                )}
              </div>
            </div>
          );
        }

        const wbs = wbsById.get(row.id);
        if (!wbs) {
          return null;
        }
        const selected = selectedTaskId === row.id;
        return (
          <div
            key={row.id}
            style={{ height: rowHeight }}
            className={`flex cursor-pointer items-center border-b border-[#E5E5EA] pl-4 pr-4 transition ${
              selected ? "bg-[#E5F1FF]" : "hover:bg-[#F2F2F7]"
            }`}
            onClick={() => {
              setSelectedTask(row.id);
              const wbs = wbsById.get(row.id);
              if (wbs) {
                onTaskClick(wbs);
              }
            }}
          >
            <div className="flex flex-1 items-center gap-2 overflow-hidden text-[13px] text-[#1C1C1E]">
              {wbs.kind === "milestone" && (
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 shrink-0 rotate-45"
                  style={{ backgroundColor: MILESTONE_COLOR }}
                />
              )}
              <span className="truncate">{wbs.name}</span>
            </div>
            <div className="flex w-24 justify-center">
              <StatusBadge status={wbs.status} />
            </div>
            <div className="w-20 truncate text-right text-[12px] text-[#8E8E93]">
              {wbs.assignee || "—"}
            </div>
          </div>
        );
      })}
    </div>
  );

  const TooltipBody: FC<{
    task: Task;
    fontSize: string;
    fontFamily: string;
  }> = ({ task }) => {
    if (task.type === "project") {
      const meta = phases.find((p) => p.id === task.id);
      return (
        <div className="rounded-xl border border-[#E5E5EA] bg-white p-3 text-xs shadow-lg">
          <div className="font-semibold text-[#1C1C1E]">
            {meta?.label ?? task.name}
          </div>
          {meta?.goal && <div className="mt-1 text-[#8E8E93]">{meta.goal}</div>}
          <div className="mt-1 text-[#8E8E93]">
            {formatShortDate(task.start)} – {formatShortDate(task.end)}
          </div>
        </div>
      );
    }
    const wbs = wbsById.get(task.id);
    if (!wbs) {
      return null;
    }
    return (
      <div className="min-w-[200px] space-y-1.5 rounded-xl border border-[#E5E5EA] bg-white p-3 text-xs shadow-lg">
        <div className="font-semibold text-[#1C1C1E]">{wbs.name}</div>
        <div className="text-[#8E8E93]">{formatBarLabel(wbs)}</div>
        <div className="flex items-center gap-2 text-[#8E8E93]">
          <span>ステータス</span>
          <StatusBadge status={wbs.status} />
        </div>
        <div className="text-[#8E8E93]">担当: {wbs.assignee || "—"}</div>
        {wbs.kind !== "milestone" && (
          <div className="text-[#8E8E93]">進捗: {wbs.progress}%</div>
        )}
      </div>
    );
  };

  if (ganttTasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#8E8E93]">
        フィルタ条件に一致するタスクがありません
      </div>
    );
  }

  return (
    <div className="gantt-wrapper overflow-auto bg-white">
      <Gantt
        tasks={ganttTasks}
        viewMode={viewMode}
        columnWidth={columnWidth}
        listCellWidth={LIST_WIDTH}
        rowHeight={ROW_HEIGHT}
        headerHeight={HEADER_HEIGHT}
        barCornerRadius={4}
        barFill={68}
        handleWidth={6}
        todayColor="rgba(255, 149, 0, 0.15)"
        projectBackgroundColor="#F2F2F7"
        projectBackgroundSelectedColor="#E5E5EA"
        projectProgressColor="#C7C7CC"
        projectProgressSelectedColor="#AEAEB2"
        milestoneBackgroundColor={MILESTONE_COLOR}
        milestoneBackgroundSelectedColor="#8E44AD"
        arrowColor="#C7C7CC"
        fontFamily='-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif'
        fontSize="12px"
        locale="ja-JP"
        TaskListHeader={TaskListHeaderRow}
        TaskListTable={TaskListBody}
        TooltipContent={TooltipBody}
        onDateChange={(task) => {
          if (task.type === "task" || task.type === "milestone") {
            onDateChange(task.id, task.start, task.end);
          }
        }}
        onClick={(task) => {
          if (task.type === "task" || task.type === "milestone") {
            const wbs = tasks.find((t) => t.id === task.id);
            if (wbs) {
              onTaskClick(wbs);
            }
          }
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatBarLabel(task: WbsTask): string {
  if (task.kind === "milestone") {
    return formatShortDate(task.start);
  }
  const start = formatShortDate(task.start);
  const end = formatShortDate(task.end);
  return start === end ? start : `${start}-${end}`;
}

function formatShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function ensureRange(start: Date, end: Date): Date {
  if (end.getTime() <= start.getTime()) {
    const adjusted = new Date(start);
    adjusted.setDate(adjusted.getDate() + 1);
    return adjusted;
  }
  return end;
}
