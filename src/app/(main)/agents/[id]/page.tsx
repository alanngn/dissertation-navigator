import { AgentEditorPage } from "@/components/agents/AgentEditorPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAgentPage({ params }: PageProps) {
  const { id } = await params;
  return <AgentEditorPage agentId={id} />;
}
