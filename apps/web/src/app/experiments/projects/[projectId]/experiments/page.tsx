import type { Metadata } from "next";

import { ExperimentRunsPage } from "@/features/experiment-runs/experiment-runs-page";

export const metadata: Metadata = { title: "Project Experiments" };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ExperimentRunsPage projectId={projectId} />;
}
