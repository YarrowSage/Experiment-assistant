import { WorkbenchHomePage } from "@/features/workbenches";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("workbench.animal.title");

export default function AnimalWorkbenchPage() {
  return <WorkbenchHomePage workbenchId="animal" />;
}
