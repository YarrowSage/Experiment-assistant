"use client";

import { ChartNoAxesColumnIncreasing } from "lucide-react";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";

import styles from "../pages.module.css";

export default function AnalysisPage() {
  const { t } = useLocalization();
  return (
    <div className={styles.pageStack}>
      <PageHeader
        breadcrumb={[{ href: "/", label: t("navigation.home") }, { label: t("analysis.title") }]}
        description={t("analysis.description")}
        eyebrow={t("analysis.eyebrow")}
        title={t("analysis.title")}
      />
      <Card>
        <EmptyState
          description={t("analysis.plannedDescription")}
          icon={<ChartNoAxesColumnIncreasing size={23} />}
          title={t("analysis.plannedTitle")}
        />
      </Card>
    </div>
  );
}
