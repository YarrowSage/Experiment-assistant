import type { Metadata } from "next";

import { ProjectOverview } from "@/features/projects/project-overview";

export const metadata: Metadata = { title: "Project Overview" };

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectOverview projectId={projectId} />;
}
