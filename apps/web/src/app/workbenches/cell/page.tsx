import { WorkbenchHomePage } from "@/features/workbenches";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("workbench.cell.title");

export default function CellWorkbenchPage() {
  return <WorkbenchHomePage workbenchId="cell" />;
}
