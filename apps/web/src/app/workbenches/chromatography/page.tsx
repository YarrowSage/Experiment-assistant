import { WorkbenchHomePage } from "@/features/workbenches";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("workbench.chromatography.title");

export default function ChromatographyWorkbenchPage() {
  return <WorkbenchHomePage workbenchId="chromatography" />;
}
