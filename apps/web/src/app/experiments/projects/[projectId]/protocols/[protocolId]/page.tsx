import { ProtocolDetail } from "@/features/protocols/protocol-detail";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("common.protocol");

export default async function ProtocolDetailRoute({ params }: { params: Promise<{ projectId: string; protocolId: string }> }) {
  const { projectId, protocolId } = await params;
  return <ProtocolDetail projectId={projectId} protocolId={protocolId} />;
}
