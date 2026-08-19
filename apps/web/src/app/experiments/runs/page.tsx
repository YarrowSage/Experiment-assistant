import type { Metadata } from "next";

import { ExperimentRunsPage } from "@/features/experiment-runs/experiment-runs-page";

export const metadata: Metadata = { title: "All Experiments" };

export default function Page() {
  return <ExperimentRunsPage />;
}

