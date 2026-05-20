"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { STATUS_PROGRESS_DEFAULT } from "@/lib/statusColors";
import { getTasksBySlug } from "@/data/tasks";
import { fromWire, toWire, type WbsTaskWire } from "@/lib/taskWire";
import { useAutoSave } from "@/lib/useAutoSave";
import type { Role } from "@/lib/permissions";
import type { PhaseMeta, ProjectMeta, WbsTask } from "@/types/wbs";
import {
  applyOrder,
  loadPhaseOverrides,
  moveTaskInArray,
  saveOrder,
  savePhaseOverrides,
  type PhaseOverride,
} from "@/lib/wbsLayout";
import {
  Toolbar,
  type AssigneeFilter,
  type PhaseFilter,
  type ScopeFilter,
  type StatusFilter,
  type ZoomMode,
} from "./Toolbar";
import { TaskModal } from "./TaskModal";
import { SaveIndicator } from "./SaveIndicator";
import { HeaderAuth } from "./HeaderAuth";

const GanttChart = dynamic(
  () => import("./GanttChart").then((m) => m.GanttChart),
  { ssr: false },
);

type DataSource = "notion" | "fallback" | "loading";

interface WbsContainerProps {
  project: ProjectMeta;
  canEdit: boolean;
  authEnabled: boolean;
  currentUser: { email: string; role: Role | null } | null;
}

interface TasksResponse {
  source: "notion" | "fallback";
  tasks: WbsTaskWire[];
  errors?: { id: string; name: string; reason: string }[];
  fetchError?: string;
}

export function WbsContainer({
  project,
  canEdit,
  authEnabled,
  currentUser,
}: WbsContainerProps) {
  const [tasks, setTasks] = useState<WbsTask[]>(() =>
    getTasksBySlug(project.slug),
  );
  const [source, setSource] = useState<DataSource>("loading");
  const [zoom, setZoom] = useState<ZoomMode>("week");
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [selectedTask, setSelectedTask] = useState<WbsTask | null>(null);
  const [phases, setPhases] = useState<PhaseMeta[]>(project.phases);

  useEffect(() => {
    let aborted = false;
    fetch(`/api/tasks/${project.slug}`)
      .then((r) => r.json())
      .then((data: TasksResponse) => {
        if (aborted) {
          return;
        }
        setTasks(applyOrder(project.slug, data.tasks.map(fromWire)));
        setSource(data.source);
        if (data.fetchError) {
          console.warn(
            `[WbsContainer] Notion fetch error for ${project.slug}: ${data.fetchError}`,
          );
        }
        if (data.errors && data.errors.length > 0) {
          console.warn(
            `[WbsContainer] ${data.errors.length} Notion task(s) failed to parse for ${project.slug}:`,
            data.errors,
          );
        }
      })
      .catch((err: unknown) => {
        if (aborted) {
          return;
        }
        console.error("[WbsContainer] failed to fetch tasks:", err);
        setSource("fallback");
      });
    return () => {
      aborted = true;
    };
  }, [project.slug]);

  useEffect(() => {
    setTasks((prev) => applyOrder(project.slug, prev));
  }, [project.slug]);

  useEffect(() => {
    const overrides = loadPhaseOverrides(project.slug);
    if (Object.keys(overrides).length === 0) {
      return;
    }
    setPhases(
      project.phases.map((p) =>
        overrides[p.id] ? { ...p, ...overrides[p.id] } : p,
      ),
    );
  }, [project.slug, project.phases]);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignee) {
        set.add(t.assignee);
      }
    });
    return Array.from(set).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (phaseFilter !== "all" && t.phase !== phaseFilter) {
        return false;
      }
      if (assigneeFilter !== "all" && t.assignee !== assigneeFilter) {
        return false;
      }
      if (statusFilter === "notDone" && t.status === "done") {
        return false;
      }
      if (
        statusFilter !== "all" &&
        statusFilter !== "notDone" &&
        t.status !== statusFilter
      ) {
        return false;
      }
      if (scopeFilter === "A" && t.scope !== "A" && t.scope !== undefined) {
        return false;
      }
      if (
        scopeFilter === "B" &&
        t.scope !== "A" &&
        t.scope !== "B" &&
        t.scope !== undefined
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, phaseFilter, assigneeFilter, statusFilter, scopeFilter]);

  const persistBatch = useCallback(
    async (batch: WbsTask[]) => {
      const res = await fetch(`/api/tasks/${project.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: batch.map(toWire) }),
      });
      if (!res.ok) {
        throw new Error(`PUT /api/tasks/${project.slug} → ${res.status}`);
      }
    },
    [project.slug],
  );

  const {
    status: saveStatus,
    pendingCount,
    queueChange,
    retry: retrySave,
  } = useAutoSave({ onSave: persistBatch });

  const handleDateChange = (id: string, start: Date, end: Date) => {
    if (!canEdit) {
      return;
    }

    // Check if it's a phase (epic) drag — shift all children by the delta
    const isPhase = phases.some((p) => p.id === id);
    if (isPhase) {
      const children = tasks.filter((t) => t.phase === id);
      if (children.length === 0) return;
      const oldStart = new Date(
        Math.min(...children.map((t) => t.start.getTime())),
      );
      const deltaMs = start.getTime() - oldStart.getTime();
      if (deltaMs === 0) return;
      const updated: WbsTask[] = [];
      setTasks((prev) =>
        prev.map((t) => {
          if (t.phase !== id) return t;
          const shifted: WbsTask = {
            ...t,
            start: new Date(t.start.getTime() + deltaMs),
            end: new Date(t.end.getTime() + deltaMs),
          };
          updated.push(shifted);
          return shifted;
        }),
      );
      for (const u of updated) {
        queueChange(u);
      }
      return;
    }

    let next: WbsTask | undefined;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) {
          return t;
        }
        next = { ...t, start, end };
        return next;
      }),
    );
    if (next) {
      queueChange(next);
    }
  };

  const handleInlineEdit = (updated: WbsTask) => {
    if (!canEdit) return;
    const statusChanged =
      tasks.find((t) => t.id === updated.id)?.status !== updated.status;
    const finalTask: WbsTask = {
      ...updated,
      progress: statusChanged
        ? STATUS_PROGRESS_DEFAULT[updated.status]
        : updated.progress,
    };
    setTasks((prev) =>
      prev.map((t) => (t.id === finalTask.id ? finalTask : t)),
    );
    queueChange(finalTask);
  };

  const handleSave = (updated: WbsTask) => {
    if (!canEdit) {
      setSelectedTask(null);
      return;
    }
    const statusChanged =
      tasks.find((t) => t.id === updated.id)?.status !== updated.status;
    const finalTask: WbsTask = {
      ...updated,
      progress: statusChanged
        ? STATUS_PROGRESS_DEFAULT[updated.status]
        : updated.progress,
    };
    setTasks((prev) =>
      prev.map((t) => (t.id === finalTask.id ? finalTask : t)),
    );
    setSelectedTask(null);
    queueChange(finalTask);
  };

  const handleMoveTask = useCallback(
    (taskId: string, direction: "up" | "down") => {
      if (!canEdit) {
        return;
      }
      const next = moveTaskInArray(tasks, taskId, direction);
      if (next === tasks) {
        return;
      }
      setTasks(next);
      saveOrder(
        project.slug,
        next.map((t) => t.id),
      );
    },
    [canEdit, tasks, project.slug],
  );

  const handlePhaseEdit = useCallback(
    (phaseId: string, patch: PhaseOverride) => {
      if (!canEdit) {
        return;
      }
      const next = phases.map((p) =>
        p.id === phaseId ? { ...p, ...patch } : p,
      );
      setPhases(next);
      const overrides: Record<string, PhaseOverride> = {};
      next.forEach((p) => {
        const original = project.phases.find((o) => o.id === p.id);
        if (!original) {
          return;
        }
        const override: PhaseOverride = {};
        if (p.label !== original.label) {
          override.label = p.label;
        }
        if ((p.goal ?? "") !== (original.goal ?? "")) {
          override.goal = p.goal ?? "";
        }
        if (Object.keys(override).length > 0) {
          overrides[p.id] = override;
        }
      });
      savePhaseOverrides(project.slug, overrides);
    },
    [canEdit, phases, project.phases, project.slug],
  );

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="border-b border-[#E5E5EA] bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-medium text-[#007AFF] hover:opacity-80"
            aria-label="案件一覧に戻る"
          >
            ← 案件一覧
          </Link>
          <span className="text-[#C7C7CC]">/</span>
          <h1 className="text-xl font-semibold tracking-tight text-[#1C1C1E]">
            {project.name} - WBS
          </h1>
          <SourceBadge source={source} />
          <div className="ml-auto flex items-center gap-3">
            {canEdit && (
              <SaveIndicator
                status={saveStatus}
                pendingCount={pendingCount}
                onRetry={retrySave}
              />
            )}
            <HeaderAuth authEnabled={authEnabled} user={currentUser} />
          </div>
        </div>
        <p className="mt-0.5 text-xs text-[#8E8E93]">{project.description}</p>
      </header>

      <Toolbar
        zoom={zoom}
        onZoomChange={setZoom}
        phases={phases}
        phaseFilter={phaseFilter}
        onPhaseFilterChange={setPhaseFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        assignees={assignees}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        scopeFilter={scopeFilter}
        onScopeFilterChange={setScopeFilter}
        showScopeFilter={project.slug === "ea"}
        readOnly={!canEdit}
      />

      <StatusLegend />

      <main className="flex-1 overflow-auto">
        <GanttChart
          tasks={filteredTasks}
          phases={phases}
          assignees={assignees}
          zoom={zoom}
          readOnly={!canEdit}
          onTaskClick={setSelectedTask}
          onDateChange={handleDateChange}
          onTaskInlineEdit={handleInlineEdit}
          onMoveTask={handleMoveTask}
          onPhaseEdit={handlePhaseEdit}
        />
      </main>

      <TaskModal
        task={selectedTask}
        assignees={assignees}
        phases={phases}
        canEdit={canEdit}
        onClose={() => setSelectedTask(null)}
        onSave={handleSave}
      />
    </div>
  );
}

function SourceBadge({ source }: { source: DataSource }) {
  const config: Record<DataSource, { label: string; className: string }> = {
    loading: {
      label: "読み込み中",
      className: "bg-[#F2F2F7] text-[#8E8E93]",
    },
    notion: {
      label: "Notion",
      className: "bg-[#E8F9ED] text-[#28A745]",
    },
    fallback: {
      label: "ローカル",
      className: "bg-[#FFF3E0] text-[#E65100]",
    },
  };
  const { label, className } = config[source];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

function StatusLegend() {
  const items: { label: string; color: string }[] = [
    { label: "完了", color: "#007AFF" },
    { label: "進行中", color: "#34C759" },
    { label: "FB待ち", color: "#8E8E93" },
    { label: "予定", color: "#5856D6" },
    { label: "新規", color: "#FF9500" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#E5E5EA] bg-[#F2F2F7] px-6 py-2 text-xs text-[#8E8E93]">
      <span className="font-medium text-[#1C1C1E]">凡例:</span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
      <span className="ml-2 flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-3 w-3 rotate-45"
          style={{ backgroundColor: "#AF52DE" }}
        />
        マイルストーン
      </span>
    </div>
  );
}
