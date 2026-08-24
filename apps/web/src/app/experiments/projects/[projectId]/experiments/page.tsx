import { ExperimentRunsPage } from "@/features/experiment-runs/experiment-runs-page";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("experiments.projectTitle");

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ExperimentRunsPage projectId={projectId} />;
}
