"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";
import { Gantt, type Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
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
  assignees: string[];
  zoom: ZoomMode;
  /**
   * `fitSignal` を変更（インクリメント）すると、ガントの列幅を
   * 表示可能領域に合わせて自動調整する。
   */
  fitSignal?: number;
  readOnly: boolean;
  onTaskClick: (task: WbsTask) => void;
  onDateChange: (id: string, start: Date, end: Date) => void;
  onTaskInlineEdit: (updated: WbsTask) => void;
  onMoveTask: (taskId: string, direction: "up" | "down") => void;
  onReorderTask: (
    draggedId: string,
    targetId: string,
    position: "before" | "after",
  ) => void;
  onPhaseEdit: (
    phaseId: string,
    patch: { label?: string; goal?: string },
  ) => void;
}

/**
 * フェーズごとのバー配色。phases 配列の index で対応付ける（青→緑→オレンジ→グレー）。
 * 4 を超える場合はラップする。
 */
interface PhaseBarColor {
  main: string;
  taskBg: string;
  epicBg: string;
  phaseBg: string;
}

const PHASE_BAR_COLORS: PhaseBarColor[] = [
  { main: "#007AFF", taskBg: "#D6E4FF", epicBg: "#B8DAFF", phaseBg: "#E5F1FF" },
  { main: "#34C759", taskBg: "#D8F2E0", epicBg: "#B8E4C5", phaseBg: "#E8F9ED" },
  { main: "#FF9500", taskBg: "#FFE4C2", epicBg: "#FFD297", phaseBg: "#FFF3E0" },
  { main: "#8E8E93", taskBg: "#E5E5EA", epicBg: "#D1D1D6", phaseBg: "#F2F2F7" },
];

/** ガント上部のマイルストーン専用トラック（合成フェーズ）の ID。 */
const MILESTONE_TRACK_ID = "__milestone_track__";

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
// gantt-task-react の水平スクロールバー（1.2rem）ぶんの余白。
const HSCROLL_HEIGHT = 20;
const MIN_GANTT_HEIGHT = 160;

export function GanttChart({
  tasks,
  phases,
  zoom,
  fitSignal,
  readOnly,
  onTaskClick,
  onDateChange,
  onMoveTask,
  onReorderTask,
  onPhaseEdit,
}: GanttChartProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [editingPhase, setEditingPhase] = useState<{
    id: string;
    field: "label" | "goal";
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [ganttHeight, setGanttHeight] = useState(0);
  const [columnWidthOverride, setColumnWidthOverride] = useState<number | null>(
    null,
  );

  // ドラッグ&ドロップ並び替えの状態。連続発火する dragover で再レンダリングを
  // 起こさないよう state ではなく ref で保持し、インジケーターは DOM 直接操作で描画する。
  const draggedIdRef = useRef<string | null>(null);
  const dropTargetRef = useRef<{
    el: HTMLElement;
    position: "before" | "after";
  } | null>(null);

  const clearDropIndicator = useCallback(() => {
    const current = dropTargetRef.current;
    if (current) {
      current.el.classList.remove("wbs-drop-before", "wbs-drop-after");
      dropTargetRef.current = null;
    }
  }, []);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }
    const updateHeight = () => {
      const available = element.clientHeight - HEADER_HEIGHT - HSCROLL_HEIGHT;
      setGanttHeight(Math.max(available, MIN_GANTT_HEIGHT));
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

    // 1) 上部マイルストーントラック（合成フェーズ）。全 milestone タスクを集約。
    const milestones = tasks.filter((t) => t.kind === "milestone");
    if (milestones.length > 0) {
      const trackStart = new Date(
        Math.min(...milestones.map((t) => t.start.getTime())),
      );
      const trackEnd = new Date(
        Math.max(...milestones.map((t) => t.end.getTime())),
      );
      result.push({
        id: MILESTONE_TRACK_ID,
        name: "マイルストーン",
        start: trackStart,
        end: ensureRange(trackStart, trackEnd),
        progress: 0,
        type: "project",
        hideChildren: false,
        isDisabled: true,
        // バーを描画しない（行のみ確保し、子のダイヤを横一列に並べる）。
        styles: {
          backgroundColor: "rgba(0,0,0,0)",
          backgroundSelectedColor: "rgba(0,0,0,0)",
          progressColor: "rgba(0,0,0,0)",
          progressSelectedColor: "rgba(0,0,0,0)",
        },
      });
      for (const m of milestones) {
        result.push({
          id: m.id,
          name: m.name,
          start: m.start,
          end: m.start,
          progress: 100,
          type: "milestone",
          project: MILESTONE_TRACK_ID,
          isDisabled: readOnly,
          styles: {
            backgroundColor: MILESTONE_COLOR,
            backgroundSelectedColor: MILESTONE_COLOR,
            progressColor: MILESTONE_COLOR,
            progressSelectedColor: MILESTONE_COLOR,
          },
        });
      }
    }

    // 2) 各フェーズの行＋エピック行＋タスク行。milestone は上部トラックに集約済みなので除外。
    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi];
      const colorSet = PHASE_BAR_COLORS[pi % PHASE_BAR_COLORS.length];

      const phaseTasks = tasks.filter(
        (t) => t.phase === phase.id && t.kind !== "milestone",
      );
      if (phaseTasks.length === 0) {
        continue;
      }

      const phaseStart = new Date(
        Math.min(...phaseTasks.map((t) => t.start.getTime())),
      );
      const phaseEnd = new Date(
        Math.max(...phaseTasks.map((t) => t.end.getTime())),
      );
      const phaseProgress = Math.round(
        phaseTasks.reduce((s, t) => s + t.progress, 0) / phaseTasks.length,
      );
      const phaseCollapsed = collapsed.has(phase.id);

      result.push({
        id: phase.id,
        name: phase.label,
        start: phaseStart,
        end: ensureRange(phaseStart, phaseEnd),
        progress: phaseProgress,
        type: "project",
        hideChildren: phaseCollapsed,
        isDisabled: readOnly,
        styles: {
          backgroundColor: colorSet.phaseBg,
          backgroundSelectedColor: colorSet.phaseBg,
          progressColor: colorSet.main,
          progressSelectedColor: colorSet.main,
        },
      });

      if (phaseCollapsed) {
        continue;
      }

      const epicGroups = groupByEpic(phaseTasks);

      for (const group of epicGroups) {
        if (group.id) {
          const epicStart = new Date(
            Math.min(...group.tasks.map((t) => t.start.getTime())),
          );
          const epicEnd = new Date(
            Math.max(...group.tasks.map((t) => t.end.getTime())),
          );
          const epicProgress = Math.round(
            group.tasks.reduce((s, t) => s + t.progress, 0) /
              group.tasks.length,
          );
          const epicCollapsed = collapsed.has(group.id);

          result.push({
            id: group.id,
            name: group.name,
            start: epicStart,
            end: ensureRange(epicStart, epicEnd),
            progress: epicProgress,
            type: "project",
            project: phase.id,
            hideChildren: epicCollapsed,
            isDisabled: readOnly,
            styles: {
              backgroundColor: colorSet.epicBg,
              backgroundSelectedColor: colorSet.epicBg,
              progressColor: colorSet.main,
              progressSelectedColor: colorSet.main,
            },
          });

          if (epicCollapsed) {
            continue;
          }
        }

        for (const t of group.tasks) {
          result.push({
            id: t.id,
            name: formatBarLabel(t),
            start: t.start,
            end: ensureRange(t.start, t.end),
            progress: t.progress,
            type: "task",
            project: group.id ?? phase.id,
            isDisabled: readOnly,
            styles: {
              backgroundColor: colorSet.taskBg,
              backgroundSelectedColor: colorSet.taskBg,
              progressColor: colorSet.main,
              progressSelectedColor: colorSet.main,
            },
          });
        }
      }
    }

    return result;
  }, [tasks, phases, readOnly, collapsed]);

  // フェーズ／エピック判定用のセット。
  const phaseIdSet = useMemo(() => new Set(phases.map((p) => p.id)), [phases]);

  const viewMode = resolveViewMode(zoom);
  const defaultColumnWidth = defaultColumnWidthFor(zoom);
  const columnWidth = columnWidthOverride ?? defaultColumnWidth;

  // ズーム変更時は手動オーバーライドをリセットする。
  useEffect(() => {
    setColumnWidthOverride(null);
  }, [zoom]);

  // 全体表示要求: 表示可能なガント領域とタスク全体の日付レンジから列幅を逆算する。
  useEffect(() => {
    if (fitSignal === undefined) {
      return;
    }
    const el = wrapperRef.current;
    if (!el) {
      return;
    }
    const available = Math.max(
      el.clientWidth - parseInt(LIST_WIDTH, 10) - 24,
      200,
    );
    const range = computeDateRange(tasks);
    if (!range) {
      return;
    }
    const columns = countColumns(range.start, range.end, zoom);
    if (columns <= 0) {
      return;
    }
    const next = Math.max(Math.floor(available / columns), 24);
    setColumnWidthOverride(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

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
  }) => (
    <div style={{ width: rowWidth }} className="bg-white">
      {rows.map((row, rowIndex) => {
        // 1) 合成マイルストーントラックの行
        if (row.id === MILESTONE_TRACK_ID) {
          return (
            <div
              key={row.id}
              style={{
                height: rowHeight,
                backgroundColor: "#F2F2F7",
                borderLeftColor: MILESTONE_COLOR,
                borderLeftWidth: 4,
              }}
              className="flex items-center border-b border-l-4 border-[#E5E5EA] pl-3 pr-4"
            >
              <span
                aria-hidden
                className="mr-2 inline-block h-2.5 w-2.5 rotate-45"
                style={{ backgroundColor: MILESTONE_COLOR }}
              />
              <span className="truncate text-[12px] font-semibold uppercase tracking-wide text-[#5856D6]">
                マイルストーン
              </span>
            </div>
          );
        }

        // 2) フェーズ行（type=project かつ phases に存在）
        if (row.type === "project" && phaseIdSet.has(row.id)) {
          const meta = phases.find((p) => p.id === row.id);
          const colorSet =
            PHASE_BAR_COLORS[
              (phaseIndex.get(row.id) ?? 0) % PHASE_BAR_COLORS.length
            ];
          const isCollapsed = collapsed.has(row.id);
          return (
            <div
              key={row.id}
              style={{
                height: rowHeight,
                borderLeftColor: colorSet.main,
                borderLeftWidth: 4,
                backgroundColor: colorSet.phaseBg,
              }}
              className="flex cursor-pointer items-center border-b border-l-4 border-[#E5E5EA] pl-3 pr-4 transition hover:brightness-95"
              onClick={() => {
                toggleCollapse(row.id);
              }}
            >
              <span
                className="mr-2 inline-block text-[11px] text-[#1C1C1E] transition-transform"
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                }}
              >
                ▼
              </span>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                {!readOnly &&
                editingPhase?.id === row.id &&
                editingPhase.field === "label" ? (
                  <InlineEdit
                    value={meta?.label ?? row.name}
                    ariaLabel="フェーズ名"
                    className="w-full rounded border border-[#007AFF] bg-white px-1 py-0.5 text-[13px] font-semibold text-[#1C1C1E] focus:outline-none"
                    onCommit={(value) => {
                      const trimmed = value.trim();
                      if (trimmed) {
                        onPhaseEdit(row.id, { label: trimmed });
                      }
                      setEditingPhase(null);
                    }}
                    onCancel={() => setEditingPhase(null)}
                  />
                ) : (
                  <span
                    className={`truncate text-[13px] font-semibold text-[#1C1C1E] ${
                      readOnly
                        ? ""
                        : "cursor-text rounded px-0.5 hover:bg-white/60"
                    }`}
                    onClick={(e) => {
                      if (readOnly) {
                        return;
                      }
                      e.stopPropagation();
                      setEditingPhase({ id: row.id, field: "label" });
                    }}
                  >
                    {meta?.label ?? row.name}
                  </span>
                )}
                {!readOnly &&
                editingPhase?.id === row.id &&
                editingPhase.field === "goal" ? (
                  <InlineEdit
                    value={meta?.goal ?? ""}
                    ariaLabel="フェーズの目標"
                    placeholder="目標を入力"
                    className="mt-0.5 w-full rounded border border-[#007AFF] bg-white px-1 py-0.5 text-[11px] text-[#8E8E93] focus:outline-none"
                    onCommit={(value) => {
                      onPhaseEdit(row.id, { goal: value.trim() });
                      setEditingPhase(null);
                    }}
                    onCancel={() => setEditingPhase(null)}
                  />
                ) : meta?.goal ? (
                  <span
                    className={`truncate text-[11px] text-[#8E8E93] ${
                      readOnly
                        ? ""
                        : "cursor-text rounded px-0.5 hover:bg-white/60"
                    }`}
                    onClick={(e) => {
                      if (readOnly) {
                        return;
                      }
                      e.stopPropagation();
                      setEditingPhase({ id: row.id, field: "goal" });
                    }}
                  >
                    （{meta.goal}）
                  </span>
                ) : readOnly ? null : (
                  <span
                    className="cursor-text truncate text-[11px] text-[#C7C7CC] hover:text-[#8E8E93]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPhase({ id: row.id, field: "goal" });
                    }}
                  >
                    ＋ 目標を追加
                  </span>
                )}
              </div>
            </div>
          );
        }

        // 3) エピック行（type=project かつ phases に無い＝中間階層）
        if (row.type === "project") {
          const parentPhaseId = row.project;
          const colorSet =
            parentPhaseId && phaseIndex.has(parentPhaseId)
              ? PHASE_BAR_COLORS[
                  (phaseIndex.get(parentPhaseId) ?? 0) % PHASE_BAR_COLORS.length
                ]
              : PHASE_BAR_COLORS[0];
          const isCollapsed = collapsed.has(row.id);
          return (
            <div
              key={row.id}
              style={{
                height: rowHeight,
                borderLeftColor: colorSet.main,
                borderLeftWidth: 2,
                backgroundColor: "#FAFAFC",
              }}
              className="flex cursor-pointer items-center border-b border-l-2 border-[#E5E5EA] pl-8 pr-4 transition hover:bg-[#F2F2F7]"
              onClick={() => {
                toggleCollapse(row.id);
              }}
            >
              <span
                className="mr-2 inline-block text-[10px] text-[#8E8E93] transition-transform"
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                }}
              >
                ▼
              </span>
              <span className="truncate text-[12px] font-semibold text-[#1C1C1E]">
                {row.name}
              </span>
            </div>
          );
        }

        // 4) タスク／マイルストーンの葉行
        const wbs = wbsById.get(row.id);
        if (!wbs) {
          return null;
        }
        const isMilestoneRow = row.project === MILESTONE_TRACK_ID;
        const indentPx = isMilestoneRow ? 32 : wbs.epic ? 56 : 32;
        const selected = selectedTaskId === row.id;

        // 同一フェーズ内の前後行を確認し、↑↓ボタンの表示可否を決める。
        // マイルストーントラックは並び替え不可。
        const sameGroupNeighbors = (other: Task | undefined) => {
          if (!other) {
            return false;
          }
          if (other.type === "project") {
            return false;
          }
          if (other.project !== row.project) {
            return false;
          }
          return true;
        };
        const isFirstInGroup = !sameGroupNeighbors(rows[rowIndex - 1]);
        const isLastInGroup = !sameGroupNeighbors(rows[rowIndex + 1]);
        const draggable = !readOnly && !isMilestoneRow;
        return (
          <div
            key={row.id}
            style={{
              height: rowHeight,
              paddingLeft: indentPx,
            }}
            draggable={draggable}
            className={`flex cursor-pointer items-center border-b border-[#E5E5EA] pr-4 transition ${
              selected ? "bg-[#E5F1FF]" : "hover:bg-[#F2F2F7]"
            }`}
            onClick={() => {
              setSelectedTask(row.id);
              onTaskClick(wbs);
            }}
            onDragStart={(e) => {
              if (!draggable) {
                return;
              }
              draggedIdRef.current = row.id;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", row.id);
              e.currentTarget.classList.add("wbs-dragging");
            }}
            onDragOver={(e) => {
              const draggedId = draggedIdRef.current;
              if (!draggedId || draggedId === row.id) {
                return;
              }
              const dragged = wbsById.get(draggedId);
              if (!dragged || dragged.phase !== wbs.phase) {
                clearDropIndicator();
                return;
              }
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              const rect = e.currentTarget.getBoundingClientRect();
              const position: "before" | "after" =
                e.clientY < rect.top + rect.height / 2 ? "before" : "after";
              const current = dropTargetRef.current;
              if (
                current &&
                current.el === e.currentTarget &&
                current.position === position
              ) {
                return;
              }
              clearDropIndicator();
              e.currentTarget.classList.add(
                position === "before" ? "wbs-drop-before" : "wbs-drop-after",
              );
              dropTargetRef.current = {
                el: e.currentTarget,
                position,
              };
            }}
            onDrop={(e) => {
              e.preventDefault();
              const draggedId = draggedIdRef.current;
              const current = dropTargetRef.current;
              clearDropIndicator();
              draggedIdRef.current = null;
              if (draggedId && current) {
                onReorderTask(draggedId, row.id, current.position);
              }
            }}
            onDragEnd={(e) => {
              e.currentTarget.classList.remove("wbs-dragging");
              clearDropIndicator();
              draggedIdRef.current = null;
            }}
          >
            {!readOnly && !isMilestoneRow && (
              <div className="mr-1.5 flex w-[18px] shrink-0 flex-col items-center justify-center gap-px">
                {!isFirstInGroup && (
                  <button
                    type="button"
                    aria-label="上に移動"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveTask(row.id, "up");
                    }}
                    className="flex h-[13px] w-[18px] items-center justify-center rounded text-[10px] leading-none text-[#C7C7CC] transition hover:bg-[#E5E5EA] hover:text-[#1C1C1E]"
                  >
                    ↑
                  </button>
                )}
                {!isLastInGroup && (
                  <button
                    type="button"
                    aria-label="下に移動"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveTask(row.id, "down");
                    }}
                    className="flex h-[13px] w-[18px] items-center justify-center rounded text-[10px] leading-none text-[#C7C7CC] transition hover:bg-[#E5E5EA] hover:text-[#1C1C1E]"
                  >
                    ↓
                  </button>
                )}
              </div>
            )}
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
    if (task.id === MILESTONE_TRACK_ID) {
      return null;
    }
    if (task.type === "project") {
      const meta = phases.find((p) => p.id === task.id);
      const label = meta?.label ?? task.name;
      const isEpic = !meta;
      return (
        <div className="rounded-xl border border-[#E5E5EA] bg-white p-3 text-xs shadow-lg">
          <div className="font-semibold text-[#1C1C1E]">{label}</div>
          {isEpic && (
            <div className="mt-1 text-[10px] uppercase tracking-wide text-[#5856D6]">
              エピック
            </div>
          )}
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
      <div
        ref={wrapperRef}
        className="gantt-wrapper h-full overflow-auto bg-white"
      >
        <div className="flex h-64 items-center justify-center text-sm text-[#8E8E93]">
          フィルタ条件に一致するタスクがありません
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="gantt-wrapper h-full overflow-auto bg-white"
    >
      <Gantt
        tasks={ganttTasks}
        viewMode={viewMode}
        columnWidth={columnWidth}
        listCellWidth={LIST_WIDTH}
        rowHeight={ROW_HEIGHT}
        headerHeight={HEADER_HEIGHT}
        ganttHeight={ganttHeight}
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
          onDateChange(task.id, task.start, task.end);
        }}
        onExpanderClick={(task) => {
          toggleCollapse(task.id);
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

function InlineEdit({
  value,
  onCommit,
  onCancel,
  className,
  ariaLabel,
  placeholder,
}: {
  value: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
  className: string;
  ariaLabel: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    onCommit(draft);
  };

  const cancel = () => {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    onCancel();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      onChange={(e) => setDraft(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      onBlur={commit}
    />
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

/**
 * フェーズ内のタスクをエピック（直上の親）でグルーピングして並べ替える。
 * エピックの出現順は最初のタスクの登場順を維持し、エピック内のタスク順も
 * 元の配列順を保つ（applyOrder で復元された並びを壊さない）。
 * エピック未指定のタスクは末尾にまとめる。
 */
function resolveViewMode(zoom: ZoomMode): ViewMode {
  switch (zoom) {
    case "day":
      return ViewMode.Day;
    case "week":
      return ViewMode.Week;
    case "month":
      return ViewMode.Month;
    case "year":
      return ViewMode.Year;
  }
}

function defaultColumnWidthFor(zoom: ZoomMode): number {
  switch (zoom) {
    case "day":
      return 32;
    case "week":
      return 90;
    case "month":
      return 200;
    case "year":
      return 180;
  }
}

function computeDateRange(tasks: WbsTask[]): { start: Date; end: Date } | null {
  if (tasks.length === 0) {
    return null;
  }
  const startMs = Math.min(...tasks.map((t) => t.start.getTime()));
  const endMs = Math.max(...tasks.map((t) => t.end.getTime()));
  return { start: new Date(startMs), end: new Date(endMs) };
}

function countColumns(start: Date, end: Date, zoom: ZoomMode): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY) + 1,
  );
  switch (zoom) {
    case "day":
      return totalDays;
    case "week":
      return Math.ceil(totalDays / 7);
    case "month":
      return Math.max(
        1,
        (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1,
      );
    case "year":
      return Math.max(1, end.getFullYear() - start.getFullYear() + 1);
  }
}

interface EpicGroup {
  id: string | null;
  name: string;
  tasks: WbsTask[];
}

/**
 * フェーズ内のタスクをエピック（直上の親）でグルーピングする。
 * エピックの出現順はタスクの登場順を維持し、エピック未指定のタスクは末尾に集約。
 */
function groupByEpic(tasks: WbsTask[]): EpicGroup[] {
  const order: string[] = [];
  const map = new Map<string, EpicGroup>();
  const noEpicKey = "__no_epic__";
  for (const t of tasks) {
    const key = t.epic?.id ?? noEpicKey;
    if (!map.has(key)) {
      map.set(key, {
        id: t.epic?.id ?? null,
        name: t.epic?.name ?? "",
        tasks: [],
      });
      order.push(key);
    }
    map.get(key)!.tasks.push(t);
  }
  const sorted = order.filter((k) => k !== noEpicKey);
  if (map.has(noEpicKey)) {
    sorted.push(noEpicKey);
  }
  return sorted.map((k) => map.get(k)!);
}
