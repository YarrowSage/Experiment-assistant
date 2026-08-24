"use client";

import { useLocalization } from "@/locales/localization-provider";

import { workbenchRegistry } from "./registry";
import { WorkbenchCard } from "./workbench-card";
import { WorkbenchHeader } from "./workbench-header";
import { WorkbenchLayout } from "./workbench-layout";
import styles from "./workbenches.module.css";

export function WorkbenchGallery() {
  const { t } = useLocalization();

  return (
    <WorkbenchLayout
      header={
        <WorkbenchHeader
          breadcrumb={[
            { href: "/", labelKey: "navigation.home" },
            { labelKey: "workbenches.title" },
          ]}
          descriptionKey="workbench.gallery.description"
          eyebrowKey="workbench.gallery.eyebrow"
          titleKey="workbenches.title"
        />
      }
    >
      <section aria-label={t("workbench.gallery.ariaLabel")} className={styles.galleryGrid}>
        {workbenchRegistry.map((workbench) => (
          <WorkbenchCard key={workbench.id} workbench={workbench} />
        ))}
      </section>
    </WorkbenchLayout>
  );
}
