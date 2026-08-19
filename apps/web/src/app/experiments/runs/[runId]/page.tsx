import type { Metadata } from "next";

import { ExperimentRunDetail } from "@/features/experiment-runs/experiment-run-detail";

export const metadata: Metadata = { title: "Experiment" };

export default async function Page({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <ExperimentRunDetail runId={runId} />;
}
