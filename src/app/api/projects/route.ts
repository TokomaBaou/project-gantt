import { NextResponse } from "next/server";
import { PROJECTS } from "@/data/projects";

export function GET() {
  return NextResponse.json({
    projects: PROJECTS.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      phases: p.phases,
    })),
  });
}
