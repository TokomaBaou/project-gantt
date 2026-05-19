"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WbsTask } from "@/types/wbs";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  /**
   * Async function that persists a batch of tasks. Must throw to signal
   * failure (the hook will move into "error" state and restore the queue).
   */
  onSave: (tasks: WbsTask[]) => Promise<void>;
  /** Debounce window before a flush is attempted. Defaults to 3000ms. */
  delayMs?: number;
  /** How long the "saved" indicator stays before reverting to idle. */
  savedFadeMs?: number;
}

export interface UseAutoSaveReturn {
  status: SaveStatus;
  pendingCount: number;
  queueChange: (task: WbsTask) => void;
  retry: () => void;
}

export function useAutoSave({
  onSave,
  delayMs = 3000,
  savedFadeMs = 2000,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);

  const queueRef = useRef<Map<string, WbsTask>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const clearFade = useCallback(() => {
    if (fadeRef.current) {
      clearTimeout(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  const syncPending = useCallback(() => {
    setPendingCount(queueRef.current.size);
  }, []);

  // flush is intentionally stable across renders (no deps in useCallback)
  // so timers scheduled in past renders continue to invoke the current logic.
  const flush = useCallback(async () => {
    clearDebounce();
    if (queueRef.current.size === 0) {
      return;
    }
    const items = Array.from(queueRef.current.values());
    queueRef.current.clear();
    syncPending();
    clearFade();
    setStatus("saving");
    try {
      await onSaveRef.current(items);
      if (queueRef.current.size > 0) {
        // New edits arrived during the request — schedule another round.
        setStatus("dirty");
        syncPending();
        debounceRef.current = setTimeout(() => {
          void flush();
        }, delayMs);
      } else {
        setStatus("saved");
        fadeRef.current = setTimeout(() => {
          setStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, savedFadeMs);
      }
    } catch (err) {
      console.error("[useAutoSave] flush failed:", err);
      // Restore the failed batch, but let newer queued edits win.
      for (const item of items) {
        if (!queueRef.current.has(item.id)) {
          queueRef.current.set(item.id, item);
        }
      }
      syncPending();
      setStatus("error");
    }
  }, [clearDebounce, clearFade, delayMs, savedFadeMs, syncPending]);

  const queueChange = useCallback(
    (task: WbsTask) => {
      queueRef.current.set(task.id, task);
      syncPending();
      clearFade();
      setStatus("dirty");
      clearDebounce();
      debounceRef.current = setTimeout(() => {
        void flush();
      }, delayMs);
    },
    [clearDebounce, clearFade, delayMs, flush, syncPending],
  );

  const retry = useCallback(() => {
    void flush();
  }, [flush]);

  useEffect(() => {
    return () => {
      clearDebounce();
      clearFade();
    };
  }, [clearDebounce, clearFade]);

  return { status, pendingCount, queueChange, retry };
}
