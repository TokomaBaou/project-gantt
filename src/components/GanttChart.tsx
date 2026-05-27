"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";
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
  fitSignal?: number;
  focusThisWeekSignal?: number;
  byAssignee: boolean;
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
  onReorderPhases?: (
    draggedId: string,
    targetId: string,
    position: "before" | "after",
  ) => void;
}

const LIST_WIDTH = 380;
const MONTH_HEADER_H = 30;
const WEEK_HEADER_H = 26;
const LEGEND_H = 36;
const HEADER_TOTAL_H = MONTH_HEADER_H + WEEK_HEADER_H + LEGEND_H;
const PHASE_ROW_H = 48;
const EPIC_ROW_H = 36;
const TASK_ROW_H = 36;
const TIMELINE_PAD_DAYS = 7;
const MS_PER_DAY = 86400000;

// マイルストーン行のレイアウト
const MS_DIAMOND_SIZE = 8;
const MS_DIAMOND_BOTTOM_GAP = 6;
const MS_LANE_HEIGHT = 28;
const MS_ROW_TOP_PAD = 10;
const MS_ROW_BOTTOM_PAD = MS_DIAMOND_BOTTOM_GAP + MS_DIAMOND_SIZE + 2;

interface PhaseColorSet {
  main: string;
  light: string;
  soft: string;
  text: string;
}

const PHASE_COLORS: PhaseColorSet[] = [
  { main: "#6366f1", light: "#E0E7FF", soft: "#EEF2FF", text: "#3730A3" },
  { main: "#059669", light: "#D1FAE5", soft: "#ECFDF5", text: "#065F46" },
  { main: "#d97706", light: "#FED7AA", soft: "#FFFBEB", text: "#92400E" },
  { main: "#9ca3af", light: "#E5E7EB", soft: "#F9FAFB", text: "#374151" },
];

const LEGEND_PHASE_ENTRIES: { label: string }[] = [
  { label: "Web版 開発" },
  { label: "LINE版" },
  { label: "運用・精度改善" },
  { label: "受講前bot" },
];

const MILESTONE_COLOR = "#7C3AED";

// リリース日とバッジ色の対応。task.end <= 各日付ならそのリリースに含まれると判定し、
// タスクバー右端に小さなバッジを表示する。完了タスク・マイルストーンには付けない。
const RELEASE_DATES = {
  alpha: "2026-06-22",
  beta: "2026-07-06",
  line: "2026-07-31",
} as const;

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

const RELEASE_ALPHA_DATE = parseISODate(RELEASE_DATES.alpha);
const RELEASE_BETA_DATE = parseISODate(RELEASE_DATES.beta);
const RELEASE_LINE_DATE = parseISODate(RELEASE_DATES.line);

interface ReleaseBadgeInfo {
  label: string;
  color: string;
  title: string;
}

function getReleaseBadge(task: WbsTask): ReleaseBadgeInfo | null {
  if (task.status === "done") {
    return null;
  }
  if (task.kind === "milestone") {
    return null;
  }
  const endMs = startOfDay(task.end).getTime();
  if (endMs <= RELEASE_ALPHA_DATE.getTime()) {
    return { label: "α", color: "#7C3AED", title: "α版リリース（6/20）対象" };
  }
  if (endMs <= RELEASE_BETA_DATE.getTime()) {
    return { label: "β", color: "#2563EB", title: "β版リリース（7/4）対象" };
  }
  if (endMs <= RELEASE_LINE_DATE.getTime()) {
    return {
      label: "LINE",
      color: "#059669",
      title: "LINE版リリース（7/31）対象",
    };
  }
  return null;
}

const WAITING_COLOR_MAIN = "#f59e0b";
const WAITING_COLOR_LIGHT = "#FEF3C7";
const WAITING_COLOR_TEXT = "#92400E";
const WAITING_HATCH_BG =
  "repeating-linear-gradient(45deg, rgba(146, 64, 14, 0.32) 0, rgba(146, 64, 14, 0.32) 4px, transparent 4px, transparent 8px)";

const DAY_PX_BY_ZOOM: Record<ZoomMode, number> = {
  week: 18,
  month: 6,
  year: 1.6,
};

const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  done: "bg-[#E5F1FF] text-[#007AFF]",
  inProgress: "bg-[#E8F9ED] text-[#28A745]",
  waiting: "bg-[#F2F2F7] text-[#8E8E93]",
  planned: "bg-[#EDEDFC] text-[#5856D6]",
  new: "bg-[#FFF3E0] text-[#E65100]",
};

// ─────────────── 日付ユーティリティ ───────────────
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + n);
  return next;
}
function diffDays(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY,
  );
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}
function startOfISOWeek(d: Date): Date {
  const day = d.getDay() || 7;
  return startOfDay(addDays(d, -(day - 1)));
}
function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((date.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7,
  );
}
function formatShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface EpicGroup {
  id: string | null;
  name: string;
  tasks: WbsTask[];
}

interface MilestonePlacement {
  task: WbsTask;
  centerPx: number;
  /** 0 が下端（ダイヤの直上）、増えるほど上に積まれる。 */
  lane: number;
}

/**
 * マイルストーン名から末尾の括弧書き（「（リリースポイント）」等）を落として
 * ガント上で読みやすい短い表記にする。
 */
function shortMilestoneName(name: string): string {
  const trimmed = name.replace(/[（(][^（()）]*[)）]\s*$/, "").trim();
  return trimmed || name;
}

/** 10px フォントを想定したラベル幅のラフな見積もり。 */
function estimateLabelWidth(name: string): number {
  let w = 0;
  for (const ch of name) {
    if (/[ -~]/.test(ch)) {
      w += 6;
    } else {
      w += 12;
    }
  }
  return Math.max(56, w + 10);
}

/**
 * マイルストーンを日付順に走査し、ラベルが重ならないよう lane（縦の段）を
 * 割り当てる。下段（lane 0）から順に詰め、収まらないものは上段へ。
 */
function layoutMilestones(
  milestones: WbsTask[],
  xOf: (d: Date) => number,
  dayPx: number,
): MilestonePlacement[] {
  const sorted = [...milestones].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const laneRightX: number[] = [];
  return sorted.map((task) => {
    const centerPx = xOf(task.start) + dayPx / 2;
    const labelW = estimateLabelWidth(shortMilestoneName(task.name));
    const labelLeft = centerPx - labelW / 2;
    const labelRight = centerPx + labelW / 2;
    let lane = -1;
    for (let i = 0; i < laneRightX.length; i++) {
      if (labelLeft >= laneRightX[i] + 6) {
        lane = i;
        break;
      }
    }
    if (lane === -1) {
      lane = laneRightX.length;
      laneRightX.push(0);
    }
    laneRightX[lane] = labelRight;
    return { task, centerPx, lane };
  });
}

function groupByEpic(tasks: WbsTask[]): EpicGroup[] {
  const order: string[] = [];
  const map = new Map<string, EpicGroup>();
  const noEpic = "__no_epic__";
  for (const t of tasks) {
    const key = t.epic?.id ?? noEpic;
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
  const sorted = order.filter((k) => k !== noEpic);
  if (map.has(noEpic)) {
    sorted.push(noEpic);
  }
  return sorted.map((k) => map.get(k)!);
}

function rangeOf(tasks: WbsTask[]): { start: Date; end: Date } | null {
  if (tasks.length === 0) {
    return null;
  }
  const startMs = Math.min(...tasks.map((t) => t.start.getTime()));
  const endMs = Math.max(...tasks.map((t) => t.end.getTime()));
  return { start: new Date(startMs), end: new Date(endMs) };
}

interface MonthSeg {
  key: string;
  label: string;
  offsetPx: number;
  widthPx: number;
}
interface WeekSeg {
  key: string;
  label: string;
  offsetPx: number;
  widthPx: number;
}

function buildMonthSegments(start: Date, end: Date, dayPx: number): MonthSeg[] {
  const segs: MonthSeg[] = [];
  let cursor = startOfMonth(start);
  while (cursor.getTime() <= end.getTime()) {
    const next = startOfMonth(addMonths(cursor, 1));
    const segStart = cursor < start ? start : cursor;
    const segEnd = next > addDays(end, 1) ? addDays(end, 1) : next;
    const days = diffDays(segStart, segEnd);
    if (days > 0) {
      segs.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`,
        offsetPx: diffDays(start, segStart) * dayPx,
        widthPx: days * dayPx,
      });
    }
    cursor = next;
  }
  return segs;
}

function buildWeekSegments(start: Date, end: Date, dayPx: number): WeekSeg[] {
  const segs: WeekSeg[] = [];
  let cursor = startOfISOWeek(start);
  while (cursor.getTime() <= end.getTime()) {
    const next = addDays(cursor, 7);
    const segStart = cursor < start ? start : cursor;
    const segEnd = next > addDays(end, 1) ? addDays(end, 1) : next;
    const days = diffDays(segStart, segEnd);
    if (days > 0) {
      segs.push({
        key: `${cursor.getFullYear()}-${isoWeekNumber(cursor)}-${cursor.getMonth()}`,
        label: `W${isoWeekNumber(cursor)}`,
        offsetPx: diffDays(start, segStart) * dayPx,
        widthPx: days * dayPx,
      });
    }
    cursor = next;
  }
  return segs;
}

// ─────────────── 行モデル ───────────────
type Row =
  | {
      kind: "milestone-track";
      placements: MilestonePlacement[];
      laneCount: number;
    }
  | {
      kind: "phase";
      phase: PhaseMeta;
      colorSet: PhaseColorSet;
      span: { start: Date; end: Date };
      progress: number;
    }
  | {
      kind: "epic";
      id: string;
      name: string;
      phaseId: string;
      colorSet: PhaseColorSet;
      span: { start: Date; end: Date };
      progress: number;
    }
  | {
      kind: "assignee";
      id: string;
      name: string;
      colorSet: PhaseColorSet;
      span: { start: Date; end: Date };
      progress: number;
      taskCount: number;
    }
  | {
      kind: "task";
      task: WbsTask;
      colorSet: PhaseColorSet;
      indent: 1 | 2;
      isThisWeek: boolean;
    };

function rowHeightOf(row: Row): number {
  if (row.kind === "milestone-track") {
    return (
      MS_ROW_TOP_PAD +
      Math.max(1, row.laneCount) * MS_LANE_HEIGHT +
      MS_ROW_BOTTOM_PAD
    );
  }
  if (row.kind === "phase") {
    return PHASE_ROW_H;
  }
  if (row.kind === "epic") {
    return EPIC_ROW_H;
  }
  if (row.kind === "assignee") {
    return PHASE_ROW_H;
  }
  return TASK_ROW_H;
}

function rowKey(row: Row, idx: number): string {
  if (row.kind === "milestone-track") {
    return `__ms__${idx}`;
  }
  if (row.kind === "phase") {
    return `phase-${row.phase.id}`;
  }
  if (row.kind === "epic") {
    return `epic-${row.id}`;
  }
  if (row.kind === "assignee") {
    return `assignee-${row.id}`;
  }
  return `task-${row.task.id}`;
}

function startOfThisWeek(): Date {
  return startOfISOWeek(new Date());
}

function endOfThisWeek(): Date {
  return addDays(startOfThisWeek(), 6);
}

function overlapsThisWeek(
  task: WbsTask,
  weekStart: Date,
  weekEnd: Date,
): boolean {
  return (
    task.start.getTime() <= weekEnd.getTime() &&
    task.end.getTime() >= weekStart.getTime()
  );
}

// ─────────────── コンポーネント本体 ───────────────
export function GanttChart({
  tasks,
  phases,
  zoom,
  fitSignal,
  focusThisWeekSignal,
  byAssignee,
  readOnly,
  onTaskClick,
  onPhaseEdit,
  onReorderPhases,
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 初期状態は全フェーズ/エピックを折りたたんで表示する。ユーザーが
  // クリックで個別に展開する運用に変更（過去はデフォルト展開だった）。
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const phase of phases) {
      set.add(phase.id);
    }
    for (const task of tasks) {
      if (task.epic?.id) {
        set.add(task.epic.id);
      }
    }
    return set;
  });
  const [editingPhase, setEditingPhase] = useState<{
    id: string;
    field: "label" | "goal";
  } | null>(null);
  const [dayPxOverride, setDayPxOverride] = useState<number | null>(null);

  // フェーズの DnD 並び替え用 ref。連続発火する dragover で再レンダリングを
  // 起こさないよう state ではなく ref で保持し、インジケーターは DOM 直接操作で描画する。
  const draggedPhaseIdRef = useRef<string | null>(null);
  const phaseDropTargetRef = useRef<{
    el: HTMLElement;
    position: "before" | "after";
  } | null>(null);
  const clearPhaseDropIndicator = useCallback(() => {
    const current = phaseDropTargetRef.current;
    if (current) {
      current.el.classList.remove("wbs-drop-before", "wbs-drop-after");
      phaseDropTargetRef.current = null;
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const r = rangeOf(tasks);
    const today = startOfDay(new Date());
    const baseStart = r ? r.start : today;
    const baseEnd = r ? r.end : addDays(today, 30);
    const start = startOfMonth(addDays(baseStart, -TIMELINE_PAD_DAYS));
    const end = endOfMonth(addDays(baseEnd, TIMELINE_PAD_DAYS));
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: Math.max(diffDays(start, end) + 1, 1),
    };
  }, [tasks]);

  const dayPx = dayPxOverride ?? DAY_PX_BY_ZOOM[zoom] ?? 6;
  const totalWidth = totalDays * dayPx;

  useEffect(() => {
    setDayPxOverride(null);
  }, [zoom]);

  useEffect(() => {
    if (fitSignal === undefined) {
      return;
    }
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const available = el.clientWidth - LIST_WIDTH - 24;
    if (available <= 0 || totalDays <= 0) {
      return;
    }
    setDayPxOverride(Math.max(available / totalDays, 0.5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  const monthSegments = useMemo(
    () => buildMonthSegments(timelineStart, timelineEnd, dayPx),
    [timelineStart, timelineEnd, dayPx],
  );
  const showWeeks = zoom !== "year";
  const weekSegments = useMemo(
    () =>
      showWeeks ? buildWeekSegments(timelineStart, timelineEnd, dayPx) : [],
    [timelineStart, timelineEnd, dayPx, showWeeks],
  );

  const xOf = useCallback(
    (d: Date) => diffDays(timelineStart, d) * dayPx,
    [timelineStart, dayPx],
  );

  const weekStart = useMemo(() => startOfThisWeek(), []);
  const weekEnd = useMemo(() => endOfThisWeek(), []);

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    const milestones = tasks.filter((t) => t.kind === "milestone");
    if (milestones.length > 0) {
      const placements = layoutMilestones(milestones, xOf, dayPx);
      const laneCount = placements.length
        ? Math.max(...placements.map((p) => p.lane + 1))
        : 1;
      result.push({ kind: "milestone-track", placements, laneCount });
    }

    if (byAssignee) {
      const nonMilestone = tasks.filter((t) => t.kind !== "milestone");
      const phaseColorById = new Map<string, PhaseColorSet>();
      phases.forEach((p, i) => {
        phaseColorById.set(p.id, PHASE_COLORS[i % PHASE_COLORS.length]);
      });
      const groupMap = new Map<string, WbsTask[]>();
      const order: string[] = [];
      for (const t of nonMilestone) {
        const key = t.assignee && t.assignee.trim() ? t.assignee : "未割当";
        if (!groupMap.has(key)) {
          groupMap.set(key, []);
          order.push(key);
        }
        groupMap.get(key)!.push(t);
      }
      const sorted = order.filter((k) => k !== "未割当").sort();
      if (groupMap.has("未割当")) {
        sorted.push("未割当");
      }
      sorted.forEach((name, idx) => {
        const list = groupMap.get(name)!;
        const colorSet = PHASE_COLORS[idx % PHASE_COLORS.length];
        const groupRange = rangeOf(list)!;
        const groupProgress = Math.round(
          list.reduce((s, t) => s + t.progress, 0) / list.length,
        );
        const groupId = `__assignee__${name}`;
        result.push({
          kind: "assignee",
          id: groupId,
          name,
          colorSet,
          span: groupRange,
          progress: groupProgress,
          taskCount: list.length,
        });
        if (collapsed.has(groupId)) {
          return;
        }
        for (const task of list) {
          const taskColor = phaseColorById.get(task.phase) ?? colorSet;
          result.push({
            kind: "task",
            task,
            colorSet: taskColor,
            indent: 1,
            isThisWeek: overlapsThisWeek(task, weekStart, weekEnd),
          });
        }
      });
      return result;
    }

    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi];
      const colorSet = PHASE_COLORS[pi % PHASE_COLORS.length];
      const phaseTasks = tasks.filter(
        (t) => t.phase === phase.id && t.kind !== "milestone",
      );
      if (phaseTasks.length === 0) {
        continue;
      }
      const phaseRange = rangeOf(phaseTasks)!;
      const phaseProgress = Math.round(
        phaseTasks.reduce((s, t) => s + t.progress, 0) / phaseTasks.length,
      );
      result.push({
        kind: "phase",
        phase,
        colorSet,
        span: phaseRange,
        progress: phaseProgress,
      });
      if (collapsed.has(phase.id)) {
        continue;
      }
      const epics = groupByEpic(phaseTasks);
      for (const epic of epics) {
        if (epic.id) {
          const epicRange = rangeOf(epic.tasks)!;
          const epicProgress = Math.round(
            epic.tasks.reduce((s, t) => s + t.progress, 0) / epic.tasks.length,
          );
          result.push({
            kind: "epic",
            id: epic.id,
            name: epic.name,
            phaseId: phase.id,
            colorSet,
            span: epicRange,
            progress: epicProgress,
          });
          if (collapsed.has(epic.id)) {
            continue;
          }
          for (const task of epic.tasks) {
            result.push({
              kind: "task",
              task,
              colorSet,
              indent: 2,
              isThisWeek: overlapsThisWeek(task, weekStart, weekEnd),
            });
          }
        } else {
          for (const task of epic.tasks) {
            result.push({
              kind: "task",
              task,
              colorSet,
              indent: 1,
              isThisWeek: overlapsThisWeek(task, weekStart, weekEnd),
            });
          }
        }
      }
    }
    return result;
  }, [tasks, phases, collapsed, xOf, dayPx, byAssignee, weekStart, weekEnd]);

  const today = startOfDay(new Date());
  const todayInRange =
    today.getTime() >= timelineStart.getTime() &&
    today.getTime() <= timelineEnd.getTime();
  const todayPx = diffDays(timelineStart, today) * dayPx + dayPx / 2;

  const weekStartPx = diffDays(timelineStart, weekStart) * dayPx;
  const weekWidthPx = 7 * dayPx;
  const weekInRange =
    weekEnd.getTime() >= timelineStart.getTime() &&
    weekStart.getTime() <= timelineEnd.getTime();

  const gwBands = useMemo(() => {
    const bands: { left: number; width: number; key: string }[] = [];
    const startYear = timelineStart.getFullYear();
    const endYear = timelineEnd.getFullYear();
    for (let y = startYear; y <= endYear; y++) {
      const gwStart = new Date(y, 3, 29);
      const gwEnd = new Date(y, 4, 6);
      if (
        gwEnd.getTime() < timelineStart.getTime() ||
        gwStart.getTime() > timelineEnd.getTime()
      ) {
        continue;
      }
      const clampedStart =
        gwStart.getTime() < timelineStart.getTime() ? timelineStart : gwStart;
      const clampedEnd =
        gwEnd.getTime() > timelineEnd.getTime() ? timelineEnd : gwEnd;
      const left = diffDays(timelineStart, clampedStart) * dayPx;
      const width = (diffDays(clampedStart, clampedEnd) + 1) * dayPx;
      bands.push({ left, width, key: `gw-${y}` });
    }
    return bands;
  }, [timelineStart, timelineEnd, dayPx]);

  useEffect(() => {
    if (focusThisWeekSignal === undefined) {
      return;
    }
    const el = containerRef.current;
    if (!el || !weekInRange) {
      return;
    }
    const targetLeft = LIST_WIDTH + weekStartPx - 80;
    el.scrollTo({ left: Math.max(targetLeft, 0), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusThisWeekSignal]);

  const monthBoundaryPxs = useMemo(() => {
    const arr: number[] = [];
    let cursor = startOfMonth(addMonths(timelineStart, 1));
    while (cursor.getTime() <= timelineEnd.getTime()) {
      arr.push(diffDays(timelineStart, cursor) * dayPx);
      cursor = startOfMonth(addMonths(cursor, 1));
    }
    return arr;
  }, [timelineStart, timelineEnd, dayPx]);

  return (
    <div ref={containerRef} className="relative h-full overflow-auto bg-white">
      <div className="relative" style={{ minWidth: LIST_WIDTH + totalWidth }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${LIST_WIDTH}px ${totalWidth}px`,
          }}
        >
          {/* ===== 固定ヘッダー ===== */}
          <div
            className="sticky left-0 top-0 z-40 border-b border-r border-gray-200 bg-white"
            style={{ height: HEADER_TOTAL_H }}
          >
            <div
              className="flex items-end gap-2 border-b border-gray-100 px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500"
              style={{ height: MONTH_HEADER_H + WEEK_HEADER_H }}
            >
              <div className="flex-1">タスク</div>
              <div className="w-20 text-center">ステータス</div>
              <div className="w-16 text-right">担当</div>
            </div>
            <div
              className="flex items-center px-4 text-[10px] font-medium text-gray-500"
              style={{ height: LEGEND_H }}
            >
              凡例
            </div>
          </div>

          <div
            className="sticky top-0 z-30 border-b border-gray-200 bg-white"
            style={{ height: HEADER_TOTAL_H }}
          >
            <div
              className="relative border-b border-gray-100"
              style={{ height: MONTH_HEADER_H }}
            >
              {monthSegments.map((seg) => (
                <div
                  key={seg.key}
                  className="absolute top-0 flex h-full items-center border-r border-gray-200 bg-gray-50 px-2 text-[12px] font-semibold text-gray-700"
                  style={{ left: seg.offsetPx, width: seg.widthPx }}
                >
                  {seg.label}
                </div>
              ))}
            </div>
            <div
              className="relative border-b border-gray-100"
              style={{ height: WEEK_HEADER_H }}
            >
              {showWeeks &&
                weekSegments.map((seg) => (
                  <div
                    key={seg.key}
                    className="absolute top-0 flex h-full items-center justify-center border-r border-gray-100 text-[10px] text-gray-500"
                    style={{ left: seg.offsetPx, width: seg.widthPx }}
                  >
                    {seg.label}
                  </div>
                ))}
            </div>
            <div
              className="relative flex items-center gap-4 px-3 text-[11px] text-gray-600"
              style={{ height: LEGEND_H }}
            >
              {LEGEND_PHASE_ENTRIES.map((entry, i) => {
                const c = PHASE_COLORS[i % PHASE_COLORS.length];
                return (
                  <span
                    key={entry.label}
                    className="flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span
                      className="inline-block h-3 w-5 rounded-sm"
                      style={{
                        backgroundColor: c.light,
                        border: `1px solid ${c.main}`,
                      }}
                    />
                    <span
                      className="truncate text-[11px] font-medium"
                      style={{ color: c.text, maxWidth: 140 }}
                    >
                      {entry.label}
                    </span>
                  </span>
                );
              })}
              <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap">
                <span
                  aria-hidden
                  className="inline-block h-3 w-5 rounded-sm"
                  style={{
                    backgroundColor: WAITING_COLOR_LIGHT,
                    backgroundImage: WAITING_HATCH_BG,
                    border: `1px solid ${WAITING_COLOR_MAIN}`,
                  }}
                />
                <span
                  className="text-[11px] font-medium"
                  style={{ color: WAITING_COLOR_TEXT }}
                >
                  EA待ち
                </span>
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rotate-45"
                  style={{ backgroundColor: MILESTONE_COLOR }}
                />
                マイルストーン
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block h-4 w-[2px] bg-red-500" />
                今日
              </span>
            </div>
          </div>

          {/* ===== 本体 ===== */}
          {rows.map((row, idx) => {
            const height = rowHeightOf(row);
            return (
              <Fragment key={rowKey(row, idx)}>
                <LeftCell
                  row={row}
                  height={height}
                  collapsed={collapsed}
                  onToggle={toggle}
                  onTaskClick={onTaskClick}
                  onPhaseEdit={onPhaseEdit}
                  onReorderPhases={onReorderPhases}
                  draggedPhaseIdRef={draggedPhaseIdRef}
                  phaseDropTargetRef={phaseDropTargetRef}
                  clearPhaseDropIndicator={clearPhaseDropIndicator}
                  readOnly={readOnly}
                  editingPhase={editingPhase}
                  setEditingPhase={setEditingPhase}
                />
                <RightCell
                  row={row}
                  height={height}
                  totalWidth={totalWidth}
                  monthBoundaryPxs={monthBoundaryPxs}
                  xOf={xOf}
                  dayPx={dayPx}
                  onTaskClick={onTaskClick}
                />
              </Fragment>
            );
          })}
        </div>

        {/* ゴールデンウィーク帯（4/29〜5/6） */}
        {gwBands.map((band) => (
          <Fragment key={band.key}>
            <div
              aria-hidden
              className="pointer-events-none absolute z-[5]"
              style={{
                left: LIST_WIDTH + band.left,
                top: HEADER_TOTAL_H,
                bottom: 0,
                width: band.width,
                backgroundColor: "rgba(107, 114, 128, 0.15)",
                borderLeft: "1px dashed rgba(75, 85, 99, 0.4)",
                borderRight: "1px dashed rgba(75, 85, 99, 0.4)",
              }}
            />
            <div
              className="pointer-events-none absolute z-[6] flex items-center justify-center rounded-b bg-gray-500/85 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white shadow"
              style={{
                left: LIST_WIDTH + band.left + band.width / 2 - 14,
                top: HEADER_TOTAL_H,
                width: 28,
              }}
            >
              GW
            </div>
          </Fragment>
        ))}

        {/* 今週の縦帯（タイムライン領域全体に貫通） */}
        {weekInRange && (
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: LIST_WIDTH + weekStartPx,
              top: HEADER_TOTAL_H,
              bottom: 0,
              width: weekWidthPx,
              backgroundColor: "rgba(255, 214, 10, 0.12)",
              borderLeft: "1px dashed rgba(217, 119, 6, 0.45)",
              borderRight: "1px dashed rgba(217, 119, 6, 0.45)",
            }}
          />
        )}

        {/* 今日の縦線（タイムライン領域全体に貫通） */}
        {todayInRange && (
          <>
            <div
              className="pointer-events-none absolute z-20"
              style={{
                left: LIST_WIDTH + todayPx,
                top: HEADER_TOTAL_H,
                bottom: 0,
                width: 2,
                backgroundColor: "#EF4444",
              }}
            />
            <div
              className="pointer-events-none absolute z-30 whitespace-nowrap rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
              style={{
                left: LIST_WIDTH + todayPx - 16,
                top: HEADER_TOTAL_H - 8,
              }}
            >
              今日
            </div>
          </>
        )}
      </div>

      {rows.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
          フィルタ条件に一致するタスクがありません
        </div>
      )}
    </div>
  );
}

// ─────────────── 左セル ───────────────
interface LeftCellProps {
  row: Row;
  height: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onTaskClick: (task: WbsTask) => void;
  onPhaseEdit: (id: string, patch: { label?: string; goal?: string }) => void;
  onReorderPhases?: (
    draggedId: string,
    targetId: string,
    position: "before" | "after",
  ) => void;
  draggedPhaseIdRef: React.MutableRefObject<string | null>;
  phaseDropTargetRef: React.MutableRefObject<{
    el: HTMLElement;
    position: "before" | "after";
  } | null>;
  clearPhaseDropIndicator: () => void;
  readOnly: boolean;
  editingPhase: { id: string; field: "label" | "goal" } | null;
  setEditingPhase: (p: { id: string; field: "label" | "goal" } | null) => void;
}

const LeftCell: FC<LeftCellProps> = ({
  row,
  height,
  collapsed,
  onToggle,
  onTaskClick,
  onPhaseEdit,
  onReorderPhases,
  draggedPhaseIdRef,
  phaseDropTargetRef,
  clearPhaseDropIndicator,
  readOnly,
  editingPhase,
  setEditingPhase,
}) => {
  if (row.kind === "milestone-track") {
    return (
      <div
        className="sticky left-0 z-10 flex items-center border-b border-r border-gray-200 px-4"
        style={{
          height,
          background: "#F5F3FF",
          borderLeft: `4px solid ${MILESTONE_COLOR}`,
        }}
      >
        <span
          aria-hidden
          className="mr-2 inline-block h-3 w-3 rotate-45"
          style={{ backgroundColor: MILESTONE_COLOR }}
        />
        <span className="text-[12px] font-bold uppercase tracking-wider text-violet-700">
          マイルストーン
        </span>
      </div>
    );
  }

  if (row.kind === "phase") {
    const isCollapsed = collapsed.has(row.phase.id);
    const dndEnabled = !readOnly && !!onReorderPhases;
    const phaseId = row.phase.id;
    return (
      <div
        className="sticky left-0 z-10 flex cursor-pointer items-center border-b border-r border-gray-200 pr-3 transition hover:brightness-95"
        style={{
          height,
          background: row.colorSet.soft,
          borderLeft: `4px solid ${row.colorSet.main}`,
        }}
        onClick={() => onToggle(phaseId)}
        onDragOver={(e) => {
          const draggedId = draggedPhaseIdRef.current;
          if (!draggedId || draggedId === phaseId) {
            return;
          }
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = e.currentTarget.getBoundingClientRect();
          const position: "before" | "after" =
            e.clientY < rect.top + rect.height / 2 ? "before" : "after";
          const current = phaseDropTargetRef.current;
          if (
            current &&
            current.el === e.currentTarget &&
            current.position === position
          ) {
            return;
          }
          clearPhaseDropIndicator();
          e.currentTarget.classList.add(
            position === "before" ? "wbs-drop-before" : "wbs-drop-after",
          );
          phaseDropTargetRef.current = {
            el: e.currentTarget,
            position,
          };
        }}
        onDragLeave={(e) => {
          const current = phaseDropTargetRef.current;
          if (current && current.el === e.currentTarget) {
            // 別の要素へ移ったタイミングで枠を消す。dragover 側で再度立つので
            // 同じ要素内のホバーは問題にならない。
            const related = e.relatedTarget as Node | null;
            if (!related || !e.currentTarget.contains(related)) {
              clearPhaseDropIndicator();
            }
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = draggedPhaseIdRef.current;
          const current = phaseDropTargetRef.current;
          clearPhaseDropIndicator();
          draggedPhaseIdRef.current = null;
          if (
            draggedId &&
            current &&
            draggedId !== phaseId &&
            onReorderPhases
          ) {
            onReorderPhases(draggedId, phaseId, current.position);
          }
        }}
      >
        {dndEnabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={`${row.phase.label} を並び替え`}
            title="ドラッグでフェーズを並び替え"
            draggable
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              draggedPhaseIdRef.current = phaseId;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", phaseId);
              const rowEl = e.currentTarget.parentElement;
              if (rowEl) {
                rowEl.classList.add("wbs-dragging");
              }
            }}
            onDragEnd={(e) => {
              draggedPhaseIdRef.current = null;
              clearPhaseDropIndicator();
              const rowEl = e.currentTarget.parentElement;
              if (rowEl) {
                rowEl.classList.remove("wbs-dragging");
              }
            }}
            className="mr-1 flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-[14px] leading-none text-gray-400 transition hover:bg-white/70 hover:text-gray-700 active:cursor-grabbing"
          >
            ⋮⋮
          </span>
        )}
        <span
          className="mr-2 inline-block pl-1 text-[11px] text-gray-600 transition-transform"
          style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          {!readOnly &&
          editingPhase?.id === row.phase.id &&
          editingPhase.field === "label" ? (
            <InlineEdit
              value={row.phase.label}
              ariaLabel="フェーズ名"
              onCommit={(value) => {
                const trimmed = value.trim();
                if (trimmed) {
                  onPhaseEdit(row.phase.id, { label: trimmed });
                }
                setEditingPhase(null);
              }}
              onCancel={() => setEditingPhase(null)}
              className="w-full rounded border border-indigo-400 bg-white px-1 py-0.5 text-[13px] font-bold focus:outline-none"
            />
          ) : (
            <span
              className={`truncate text-[13px] font-bold ${
                readOnly ? "" : "cursor-text rounded px-0.5 hover:bg-white/70"
              }`}
              style={{ color: row.colorSet.text }}
              onClick={(e) => {
                if (readOnly) {
                  return;
                }
                e.stopPropagation();
                setEditingPhase({ id: row.phase.id, field: "label" });
              }}
            >
              {row.phase.label}
            </span>
          )}
          {row.phase.goal && (
            <span
              className="truncate text-[10px] text-gray-500"
              style={{ maxWidth: 280 }}
            >
              {row.phase.goal}
            </span>
          )}
        </div>
        <span className="ml-2 shrink-0 text-[11px] font-semibold text-gray-600">
          {row.progress}%
        </span>
      </div>
    );
  }

  if (row.kind === "epic") {
    const isCollapsed = collapsed.has(row.id);
    return (
      <div
        className="sticky left-0 z-10 flex cursor-pointer items-center border-b border-r border-gray-200 transition hover:bg-gray-50"
        style={{
          height,
          paddingLeft: 28,
          paddingRight: 12,
          background: "#FAFAFB",
          borderLeft: `2px solid ${row.colorSet.main}`,
        }}
        onClick={() => onToggle(row.id)}
      >
        <span
          className="mr-2 inline-block text-[10px] text-gray-500 transition-transform"
          style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
        <span className="flex-1 truncate text-[12px] font-semibold text-gray-700">
          {row.name}
        </span>
        <span className="ml-2 shrink-0 text-[10px] text-gray-500">
          {row.progress}%
        </span>
      </div>
    );
  }

  if (row.kind === "assignee") {
    const isCollapsed = collapsed.has(row.id);
    return (
      <div
        className="sticky left-0 z-10 flex cursor-pointer items-center border-b border-r border-gray-200 pr-3 transition hover:brightness-95"
        style={{
          height,
          background: row.colorSet.soft,
          borderLeft: `4px solid ${row.colorSet.main}`,
          paddingLeft: 12,
        }}
        onClick={() => onToggle(row.id)}
      >
        <span
          className="mr-2 inline-block text-[11px] text-gray-600 transition-transform"
          style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
        <span
          aria-hidden
          className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: row.colorSet.main }}
        >
          {row.name.slice(0, 1)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span
            className="truncate text-[13px] font-bold"
            style={{ color: row.colorSet.text }}
          >
            {row.name}
          </span>
          <span className="truncate text-[10px] text-gray-500">
            {row.taskCount}件
          </span>
        </div>
        <span className="ml-2 shrink-0 text-[11px] font-semibold text-gray-600">
          {row.progress}%
        </span>
      </div>
    );
  }

  // task row
  const t = row.task;
  const isDone = t.status === "done";
  const indentPx = row.indent === 2 ? 52 : 32;
  const isThisWeek = row.isThisWeek;
  return (
    <div
      className="sticky left-0 z-10 flex cursor-pointer items-center border-b border-r border-gray-200 bg-white pr-3 transition hover:bg-gray-50"
      style={{
        height,
        paddingLeft: indentPx,
      }}
      onClick={() => onTaskClick(t)}
    >
      <div className="flex flex-1 items-center gap-1.5 overflow-hidden text-[12px] text-gray-800">
        {isThisWeek && !isDone && (
          <span
            aria-label="今週アクティブ"
            title="今週アクティブなタスク"
            className="shrink-0 text-[12px] leading-none text-[#D97706]"
          >
            ●
          </span>
        )}
        {isDone && (
          <span aria-hidden className="shrink-0 text-[11px] text-green-600">
            ✅
          </span>
        )}
        <span
          className={`truncate ${isDone ? "text-gray-400 line-through" : ""}`}
        >
          {t.name}
        </span>
        {t.status === "waiting" && (
          <span
            title="先方（EA）ボール待ち"
            className="shrink-0 rounded px-1 py-px text-[9px] font-bold leading-none"
            style={{
              backgroundColor: WAITING_COLOR_LIGHT,
              color: WAITING_COLOR_TEXT,
              border: `1px solid ${WAITING_COLOR_MAIN}`,
            }}
          >
            EA待ち
          </span>
        )}
      </div>
      <div className="flex w-20 justify-center">
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE_CLASSES[t.status]}`}
        >
          {STATUS_LABELS[t.status]}
        </span>
      </div>
      <div className="w-16 truncate text-right text-[11px] text-gray-500">
        {t.assignee || "—"}
      </div>
    </div>
  );
};

// ─────────────── 右セル ───────────────
interface RightCellProps {
  row: Row;
  height: number;
  totalWidth: number;
  monthBoundaryPxs: number[];
  xOf: (d: Date) => number;
  dayPx: number;
  onTaskClick: (task: WbsTask) => void;
}

const RightCell: FC<RightCellProps> = ({
  row,
  height,
  totalWidth,
  monthBoundaryPxs,
  xOf,
  dayPx,
  onTaskClick,
}) => {
  return (
    <div
      className="relative border-b border-gray-200"
      style={{
        height,
        width: totalWidth,
        background: row.kind === "milestone-track" ? "#F5F3FF" : "white",
      }}
    >
      {monthBoundaryPxs.map((px) => (
        <div
          key={px}
          aria-hidden
          className="pointer-events-none absolute bottom-0 top-0 w-px bg-gray-100"
          style={{ left: px }}
        />
      ))}

      {row.kind === "milestone-track" &&
        row.placements.map(({ task, centerPx, lane }) => {
          // 行内のレイアウト:
          //   下端: ダイヤ (MS_DIAMOND_SIZE), MS_DIAMOND_BOTTOM_GAP の余白
          //   ラベル: 下段(lane 0)がダイヤに最も近く、lane が増えるほど上に積む
          const diamondTop = height - MS_DIAMOND_BOTTOM_GAP - MS_DIAMOND_SIZE;
          const laneBottom = diamondTop - 4;
          const laneTop = laneBottom - (lane + 1) * MS_LANE_HEIGHT + 4;
          const labelTop = laneTop;
          const connectorTop = labelTop + 22;
          return (
            <Fragment key={task.id}>
              {/* ラベル → ダイヤをつなぐ縦線 */}
              <div
                aria-hidden
                className="pointer-events-none absolute bg-violet-300"
                style={{
                  left: centerPx - 0.5,
                  top: connectorTop,
                  width: 1,
                  height: Math.max(diamondTop - connectorTop, 2),
                }}
              />
              {/* ラベル（名前 + 日付） */}
              <button
                type="button"
                onClick={() => onTaskClick(task)}
                title={`${task.name} (${formatShortDate(task.start)})`}
                className="absolute flex -translate-x-1/2 flex-col items-center text-center"
                style={{ left: centerPx, top: labelTop }}
              >
                <span className="whitespace-nowrap text-[10px] font-medium text-violet-700 underline decoration-violet-300 decoration-1 underline-offset-2">
                  {shortMilestoneName(task.name)}
                </span>
                <span className="mt-0.5 whitespace-nowrap text-[9px] text-gray-500">
                  {formatShortDate(task.start)}
                </span>
              </button>
              {/* ダイヤ */}
              <button
                type="button"
                onClick={() => onTaskClick(task)}
                title={`${task.name} (${formatShortDate(task.start)})`}
                aria-label={task.name}
                className="absolute -translate-x-1/2 rotate-45 shadow"
                style={{
                  left: centerPx,
                  top: diamondTop,
                  width: MS_DIAMOND_SIZE,
                  height: MS_DIAMOND_SIZE,
                  backgroundColor: MILESTONE_COLOR,
                }}
              />
            </Fragment>
          );
        })}

      {(row.kind === "phase" ||
        row.kind === "epic" ||
        row.kind === "assignee") && (
        <SpanBar
          start={row.span.start}
          end={row.span.end}
          colorSet={row.colorSet}
          progress={row.progress}
          xOf={xOf}
          dayPx={dayPx}
          height={height}
          kind={row.kind === "epic" ? "epic" : "phase"}
        />
      )}

      {row.kind === "task" && (
        <>
          <TaskBar
            task={row.task}
            colorSet={row.colorSet}
            xOf={xOf}
            dayPx={dayPx}
            height={height}
            onTaskClick={onTaskClick}
            isThisWeek={row.isThisWeek}
          />
          <ReleaseBadge
            task={row.task}
            xOf={xOf}
            dayPx={dayPx}
            height={height}
          />
        </>
      )}
    </div>
  );
};

function ReleaseBadge({
  task,
  xOf,
  dayPx,
  height,
}: {
  task: WbsTask;
  xOf: (d: Date) => number;
  dayPx: number;
  height: number;
}) {
  const badge = getReleaseBadge(task);
  if (!badge) {
    return null;
  }
  const barLeft = xOf(task.start);
  const barWidth = Math.max((diffDays(task.start, task.end) + 1) * dayPx, 6);
  const barRight = barLeft + barWidth;
  const isMulti = badge.label.length > 1;
  const badgeWidth = isMulti ? 24 : 12;
  return (
    <span
      aria-label={badge.title}
      title={badge.title}
      className="pointer-events-none absolute z-10 inline-flex items-center justify-center font-bold leading-none text-white shadow-sm"
      style={{
        // バーの右端にバッジ中央を載せる (半分内側・半分外側)
        left: barRight - badgeWidth / 2,
        top: (height - 12) / 2,
        width: badgeWidth,
        height: 12,
        borderRadius: 999,
        fontSize: 7,
        backgroundColor: badge.color,
      }}
    >
      {badge.label}
    </span>
  );
}

function SpanBar({
  start,
  end,
  colorSet,
  progress,
  xOf,
  dayPx,
  height,
  kind,
}: {
  start: Date;
  end: Date;
  colorSet: PhaseColorSet;
  progress: number;
  xOf: (d: Date) => number;
  dayPx: number;
  height: number;
  kind: "phase" | "epic";
}) {
  const left = xOf(start);
  const width = Math.max((diffDays(start, end) + 1) * dayPx, 6);
  const barHeight = kind === "phase" ? 22 : 16;
  const top = (height - barHeight) / 2;
  return (
    <div
      className="absolute overflow-hidden rounded"
      style={{
        left,
        top,
        width,
        height: barHeight,
        backgroundColor: kind === "phase" ? colorSet.light : "#FFFFFF",
        border: `1px solid ${colorSet.main}`,
      }}
    >
      <div
        className="h-full"
        style={{
          width: `${Math.min(Math.max(progress, 0), 100)}%`,
          backgroundColor: colorSet.main,
          opacity: kind === "phase" ? 0.55 : 0.75,
        }}
      />
    </div>
  );
}

function TaskBar({
  task,
  colorSet,
  xOf,
  dayPx,
  height,
  onTaskClick,
  isThisWeek,
}: {
  task: WbsTask;
  colorSet: PhaseColorSet;
  xOf: (d: Date) => number;
  dayPx: number;
  height: number;
  onTaskClick: (task: WbsTask) => void;
  isThisWeek: boolean;
}) {
  const left = xOf(task.start);
  const width = Math.max((diffDays(task.start, task.end) + 1) * dayPx, 6);
  const barHeight = 20;
  const top = (height - barHeight) / 2;
  const isDone = task.status === "done";
  const isWaiting = task.status === "waiting";
  const progressWidth = Math.min(Math.max(task.progress, 0), 100);
  const showAssigneeLabel = !!task.assignee && width >= 60;
  const baseBorderColor = isWaiting ? WAITING_COLOR_MAIN : colorSet.main;
  const highlightBorder = isThisWeek
    ? `2px solid #D97706`
    : `1px solid ${baseBorderColor}`;
  const boxShadow = isThisWeek
    ? "0 0 0 2px rgba(255, 214, 10, 0.45)"
    : undefined;
  const bgColor = isWaiting
    ? WAITING_COLOR_LIGHT
    : isDone
      ? colorSet.soft
      : colorSet.light;
  const fillColor = isWaiting ? WAITING_COLOR_MAIN : colorSet.main;
  const fillOpacity = isWaiting ? 0.55 : 0.85;
  const labelColor = isWaiting ? WAITING_COLOR_TEXT : colorSet.text;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTaskClick(task);
      }}
      title={`${task.name}${isWaiting ? "（EA待ち）" : ""}${task.assignee ? ` / ${task.assignee}` : ""} (${formatShortDate(task.start)} – ${formatShortDate(task.end)})`}
      className="absolute overflow-hidden rounded transition hover:brightness-95"
      style={{
        left,
        top,
        width,
        height: barHeight,
        backgroundColor: bgColor,
        border: highlightBorder,
        opacity: isDone ? 0.7 : 1,
        boxShadow,
      }}
    >
      <div
        className="h-full"
        style={{
          width: `${progressWidth}%`,
          backgroundColor: fillColor,
          opacity: fillOpacity,
        }}
      />
      {isWaiting && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: WAITING_HATCH_BG }}
        />
      )}
      {showAssigneeLabel && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-[9px] font-semibold leading-none"
          style={{ color: labelColor }}
        >
          {task.assignee}
        </span>
      )}
      {isDone && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px]"
        >
          ✅
        </span>
      )}
    </button>
  );
}

function InlineEdit({
  value,
  onCommit,
  onCancel,
  className,
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
  className: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
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
      ref={ref}
      type="text"
      value={draft}
      aria-label={ariaLabel}
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
