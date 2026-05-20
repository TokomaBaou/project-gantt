import type { WbsTask } from "@/types/wbs";

/**
 * ガントチャートのレイアウト設定（タスクの並び順・エピックのタイトル上書き）を
 * ブラウザの localStorage に永続化するユーティリティ。
 * Notion 連携にはこれらを保存する仕組みが無いため、案件ごとに端末ローカルで保持する。
 */

const ORDER_KEY_PREFIX = "wbs:order:";
const PHASES_KEY_PREFIX = "wbs:phases:";
const SAVE_DEBOUNCE_MS = 600;

export interface PhaseOverride {
  label?: string;
  goal?: string;
}

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function readJSON<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  if (!isBrowser()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debouncedWrite(key: string, value: unknown): void {
  if (!isBrowser()) {
    return;
  }
  const existing = saveTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    saveTimers.delete(key);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage 容量超過などは無視（UI 状態は保持済み）
    }
  }, SAVE_DEBOUNCE_MS);
  saveTimers.set(key, timer);
}

function loadOrder(slug: string): string[] {
  return readJSON<string[]>(
    ORDER_KEY_PREFIX + slug,
    [],
    (value): value is string[] =>
      Array.isArray(value) && value.every((item) => typeof item === "string"),
  );
}

/** タスク配列を、保存済みの並び順に従って並べ替える。未登録のタスクは末尾に残す。 */
export function applyOrder(slug: string, tasks: WbsTask[]): WbsTask[] {
  const saved = loadOrder(slug);
  if (saved.length === 0) {
    return tasks;
  }
  const rank = new Map<string, number>();
  saved.forEach((id, index) => rank.set(id, index));
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const rankA = rank.get(a.task.id) ?? Number.MAX_SAFE_INTEGER;
      const rankB = rank.get(b.task.id) ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.task);
}

/** 並び順（タスク ID 配列）をデバウンス付きで保存する。 */
export function saveOrder(slug: string, ids: string[]): void {
  debouncedWrite(ORDER_KEY_PREFIX + slug, ids);
}

/**
 * 指定タスクを同一フェーズ内で 1 つ上/下へ移動した新しい配列を返す。
 * 移動先が無い場合は元の配列をそのまま返す。
 */
export function moveTaskInArray(
  tasks: WbsTask[],
  taskId: string,
  direction: "up" | "down",
): WbsTask[] {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index === -1) {
    return tasks;
  }
  const { phase } = tasks[index];
  const step = direction === "up" ? -1 : 1;
  let target = index + step;
  while (
    target >= 0 &&
    target < tasks.length &&
    tasks[target].phase !== phase
  ) {
    target += step;
  }
  if (target < 0 || target >= tasks.length) {
    return tasks;
  }
  const next = tasks.slice();
  const moved = next[index];
  next[index] = next[target];
  next[target] = moved;
  return next;
}

/**
 * ドラッグ中のタスクを、ドロップ先タスクの直前/直後へ移動した新しい配列を返す。
 * 別フェーズへの移動・無変更の場合は元の配列をそのまま返す。
 */
export function reorderTaskInArray(
  tasks: WbsTask[],
  draggedId: string,
  targetId: string,
  position: "before" | "after",
): WbsTask[] {
  if (draggedId === targetId) {
    return tasks;
  }
  const draggedIndex = tasks.findIndex((task) => task.id === draggedId);
  const targetIndex = tasks.findIndex((task) => task.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) {
    return tasks;
  }
  if (tasks[draggedIndex].phase !== tasks[targetIndex].phase) {
    return tasks;
  }
  const next = tasks.slice();
  const [moved] = next.splice(draggedIndex, 1);
  let insertIndex = next.findIndex((task) => task.id === targetId);
  if (position === "after") {
    insertIndex += 1;
  }
  next.splice(insertIndex, 0, moved);
  const unchanged =
    next.length === tasks.length &&
    next.every((task, i) => task.id === tasks[i].id);
  return unchanged ? tasks : next;
}

/** 案件のエピックタイトル上書き設定を読み込む。 */
export function loadPhaseOverrides(
  slug: string,
): Record<string, PhaseOverride> {
  return readJSON<Record<string, PhaseOverride>>(
    PHASES_KEY_PREFIX + slug,
    {},
    (value): value is Record<string, PhaseOverride> =>
      typeof value === "object" && value !== null && !Array.isArray(value),
  );
}

/** エピックタイトル上書き設定をデバウンス付きで保存する。 */
export function savePhaseOverrides(
  slug: string,
  overrides: Record<string, PhaseOverride>,
): void {
  debouncedWrite(PHASES_KEY_PREFIX + slug, overrides);
}
