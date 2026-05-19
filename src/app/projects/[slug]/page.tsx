import { notFound } from "next/navigation";
import { WbsContainer } from "@/components/WbsContainer";
import { PROJECTS, getProject } from "@/data/projects";
import {
  canEditProject,
  getUserContext,
  isAuthEnabled,
} from "@/lib/auth-helpers";

interface ProjectPageProps {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: ProjectPageProps) {
  const project = getProject(params.slug);
  return {
    title: project ? `${project.name} - WBS` : "案件が見つかりません",
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = getProject(params.slug);
  if (!project) {
    notFound();
  }
  const ctx = await getUserContext();
  const canEdit = canEditProject(ctx, params.slug);
  return (
    <WbsContainer
      project={project}
      canEdit={canEdit}
      authEnabled={isAuthEnabled()}
      currentUser={
        ctx.isAuthenticated && ctx.email
          ? { email: ctx.email, role: ctx.role }
          : null
      }
    />
  );
}
