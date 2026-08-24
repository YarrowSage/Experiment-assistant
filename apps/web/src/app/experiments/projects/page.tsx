import { ProjectsPage } from "@/features/projects/projects-page";
import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("projects.title");

export default function Page() {
  return <ProjectsPage />;
}
