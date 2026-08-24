import { WorkbenchHomePage } from "@/features/workbenches";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("workbench.plate.title");

export default function PlateWorkbenchPage() {
  return <WorkbenchHomePage workbenchId="plate" />;
}
