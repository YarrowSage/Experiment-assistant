"use client";

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
import type { MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

import styles from "../pages.module.css";

const workbenches: Array<{ description: MessageKey; icon: LucideIcon; title: MessageKey }> = [
  {
    description: "workbenches.animalDescription",
    icon: PawPrint,
    title: "workbenches.animal",
  },
  {
    description: "workbenches.cellDescription",
    icon: Microscope,
    title: "workbenches.cell",
  },
  {
    description: "workbenches.plateDescription",
    icon: Grid3X3,
    title: "workbenches.plate",
  },
  {
    description: "workbenches.chromatographyDescription",
    icon: Activity,
    title: "workbenches.chromatography",
  },
];

export default function WorkbenchesPage() {
  const { t } = useLocalization();
  return (
    <div className={styles.pageStack}>
      <PageHeader
        breadcrumb={[{ href: "/", label: t("navigation.home") }, { label: t("workbenches.title") }]}
        description={t("workbenches.description")}
        eyebrow={t("workbenches.eyebrow")}
        title={t("workbenches.title")}
      />
      <section aria-label={t("accessibility.plannedWorkbenches")} className={styles.overviewGrid}>
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
                    <CardTitle>{t(workbench.title)}</CardTitle>
                    <CardDescription>{t("workbenches.placeholder")}</CardDescription>
                  </div>
                </div>
                <StatusBadge status="planned" />
              </CardHeader>
              <CardContent className={styles.workbenchBody}>
                <p>{t(workbench.description)}</p>
                <p>{t("workbenches.phaseBoundary")}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
