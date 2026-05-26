import type {
  EpicRef,
  TaskKind,
  TaskScope,
  TaskStatus,
  WbsTask,
} from "@/types/wbs";

export interface WbsTaskWire {
  id: string;
  name: string;
  kind: TaskKind;
  start: string;
  end: string;
  status: TaskStatus;
  assignee: string;
  phase: string;
  progress: number;
  scope?: TaskScope;
  epic?: EpicRef;
}

export function toWire(task: WbsTask): WbsTaskWire {
  return {
    id: task.id,
    name: task.name,
    kind: task.kind,
    start: dateToISODateOnly(task.start),
    end: dateToISODateOnly(task.end),
    status: task.status,
    assignee: task.assignee,
    phase: task.phase,
    progress: task.progress,
    scope: task.scope,
    epic: task.epic,
  };
}

export function fromWire(wire: WbsTaskWire): WbsTask {
  return {
    id: wire.id,
    name: wire.name,
    kind: wire.kind,
    start: isoDateOnlyToDate(wire.start),
    end: isoDateOnlyToDate(wire.end),
    status: wire.status,
    assignee: wire.assignee,
    phase: wire.phase,
    progress: wire.progress,
    scope: wire.scope,
    epic: wire.epic,
  };
}

export function dateToISODateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isoDateOnlyToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
