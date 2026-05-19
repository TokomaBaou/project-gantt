import { NextResponse } from "next/server";
import { getProject } from "@/data/projects";
import { canEditProject, getUserContext } from "@/lib/auth-helpers";
import { applyTaskUpdate, fetchProjectTasks } from "@/lib/taskService";
import { fromWire, toWire, type WbsTaskWire } from "@/lib/taskWire";

interface RouteContext {
  params: { slug: string };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const project = getProject(params.slug);
  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }
  const { tasks, source } = await fetchProjectTasks(params.slug);
  return NextResponse.json({
    source,
    tasks: tasks.map(toWire),
  });
}

interface PutBody {
  tasks?: WbsTaskWire[];
}

export async function PUT(request: Request, { params }: RouteContext) {
  const project = getProject(params.slug);
  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }
  const ctx = await getUserContext();
  if (!canEditProject(ctx, params.slug)) {
    return NextResponse.json(
      { error: "forbidden", reason: "edit permission required" },
      { status: 401 },
    );
  }
  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
    return NextResponse.json(
      { error: "tasks must be a non-empty array" },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    body.tasks.map((wire) => {
      const task = fromWire(wire);
      return applyTaskUpdate(project, task.id, {
        status: task.status,
        assignee: task.assignee,
        start: task.start,
        end: task.end,
        progress: task.progress,
      });
    }),
  );

  const persisted = results.filter((r) => r.persisted).length;
  return NextResponse.json({
    total: body.tasks.length,
    persisted,
    failed: body.tasks.length - persisted,
  });
}
