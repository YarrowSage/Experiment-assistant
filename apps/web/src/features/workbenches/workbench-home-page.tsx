"use client";

import { getWorkbenchDefinition, type WorkbenchId } from "./registry";
import { WorkbenchHeader } from "./workbench-header";
import { WorkbenchLayout } from "./workbench-layout";
import { WorkbenchSection } from "./workbench-section";
import { PlannedWorkbenchState } from "./workbench-states";

export function WorkbenchHomePage({ workbenchId }: { workbenchId: WorkbenchId }) {
  const workbench = getWorkbenchDefinition(workbenchId);

  return (
    <WorkbenchLayout
      header={
        <WorkbenchHeader
          breadcrumb={[
            { href: "/", labelKey: "navigation.home" },
            { href: "/workbenches", labelKey: "workbenches.title" },
            { labelKey: workbench.nameKey },
          ]}
          descriptionKey={workbench.descriptionKey}
          eyebrowKey="workbench.home.eyebrow"
          status={workbench.status}
          titleKey={workbench.nameKey}
        />
      }
    >
      <WorkbenchSection
        descriptionKey="workbench.home.foundationDescription"
        titleKey="workbench.home.foundationTitle"
      >
        <PlannedWorkbenchState descriptionKey={workbench.plannedDescriptionKey} />
      </WorkbenchSection>
    </WorkbenchLayout>
  );
}
