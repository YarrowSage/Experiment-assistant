import { ExperimentRunDetail } from "@/features/experiment-runs/experiment-run-detail";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("common.experiment");

export default async function Page({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <ExperimentRunDetail runId={runId} />;
}
