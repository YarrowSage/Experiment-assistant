import type { Metadata } from "next";
import { Activity, Grid3X3, Microscope, PawPrint, type LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatusBadge,
} from "@/components/ui";

import styles from "../pages.module.css";

export const metadata: Metadata = { title: "Workbenches" };

const workbenches: Array<{ description: string; icon: LucideIcon; title: string }> = [
  {
    description: "Longitudinal subjects, measurements, and dose records in a future structured domain model.",
    icon: PawPrint,
    title: "Animal Workbench",
  },
  {
    description: "Cell culture, passage, treatment, imaging, and measurement workflows.",
    icon: Microscope,
    title: "Cell Workbench",
  },
  {
    description: "A specialized plate and well workspace for structured experimental layouts.",
    icon: Grid3X3,
    title: "Plate Workbench",
  },
  {
    description: "A future workspace for chromatography runs, traces, fractions, and linked evidence.",
    icon: Activity,
    title: "Chromatography Workbench",
  },
];

export default function WorkbenchesPage() {
  return (
    <div className={styles.pageStack}>
      <PageHeader
        breadcrumb={[{ href: "/", label: "Home" }, { label: "Workbenches" }]}
        description="Specialized scientific workspaces share a consistent shell while keeping their own structured domain models."
        eyebrow="Structured work"
        title="Workbenches"
      />
      <section aria-label="Planned workbenches" className={styles.overviewGrid}>
        {workbenches.map((workbench) => {
          const Icon = workbench.icon;
          return (
            <Card className={styles.workbenchCard} key={workbench.title}>
              <CardHeader>
                <div className={styles.workbenchHeader}>
                  <span aria-hidden="true" className={styles.workbenchIcon}>
                    <Icon size={23} strokeWidth={1.8} />
                  </span>
                  <div>
                    <CardTitle>{workbench.title}</CardTitle>
                    <CardDescription>Domain placeholder</CardDescription>
                  </div>
                </div>
                <StatusBadge status="planned" />
              </CardHeader>
              <CardContent className={styles.workbenchBody}>
                <p>{workbench.description}</p>
                <p>No records, models, APIs, or business actions are included in P1-02.</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
