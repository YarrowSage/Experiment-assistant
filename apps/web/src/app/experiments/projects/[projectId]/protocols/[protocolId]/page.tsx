import { ProtocolDetail } from "@/features/protocols/protocol-detail";

export default async function ProtocolDetailRoute({ params }: { params: Promise<{ projectId: string; protocolId: string }> }) {
  const { projectId, protocolId } = await params;
  return <ProtocolDetail projectId={projectId} protocolId={protocolId} />;
}
