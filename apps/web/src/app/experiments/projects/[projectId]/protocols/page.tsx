import { ProtocolsPage } from "@/features/protocols/protocols-page";

export default async function ProjectProtocolsRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProtocolsPage projectId={projectId} />;
}
