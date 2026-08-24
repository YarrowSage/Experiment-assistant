import { ProjectOverview } from "@/features/projects/project-overview";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("projects.overviewTitle");

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectOverview projectId={projectId} />;
}
