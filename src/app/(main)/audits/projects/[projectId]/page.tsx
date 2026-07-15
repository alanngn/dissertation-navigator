import { ProjectDetailPage } from "@/components/audit/ProjectDetailPage";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectAuditsPage({ params }: PageProps) {
  const { projectId } = await params;
  return <ProjectDetailPage projectId={projectId} />;
}
