import { ExperimentRunsPage } from "@/features/experiment-runs/experiment-runs-page";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("navigation.allExperiments");

export default function Page() {
  return <ExperimentRunsPage />;
}
