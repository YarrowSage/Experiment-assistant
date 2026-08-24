import { PlannerPage } from "@/features/planner/planner-page";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("planner.title");

export default function Page() {
  return <PlannerPage />;
}
