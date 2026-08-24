import { ProtocolsPage } from "@/features/protocols/protocols-page";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("protocols.title");

export default async function ProjectProtocolsRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProtocolsPage projectId={projectId} />;
}
