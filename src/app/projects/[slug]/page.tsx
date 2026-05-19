import { notFound } from "next/navigation";
import { WbsContainer } from "@/components/WbsContainer";
import { PROJECTS, getProject } from "@/data/projects";

interface ProjectPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: ProjectPageProps) {
  const project = getProject(params.slug);
  return {
    title: project ? `${project.name} - WBS` : "案件が見つかりません",
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const project = getProject(params.slug);
  if (!project) {
    notFound();
  }
  return <WbsContainer project={project} />;
}
