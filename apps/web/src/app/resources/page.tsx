"use client";

import { Calculator, LayoutTemplate, LibraryBig, Star } from "lucide-react";

import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui";
import type { MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

import styles from "../pages.module.css";

const resources: Array<{ description: MessageKey; icon: typeof Calculator; title: MessageKey }> = [
  {
    description: "resources.calculatorsDescription",
    icon: Calculator,
    title: "resources.calculators",
  },
  {
    description: "resources.templatesDescription",
    icon: LayoutTemplate,
    title: "resources.templates",
  },
  {
    description: "resources.kitsManualsDescription",
    icon: LibraryBig,
    title: "resources.kitsManuals",
  },
  {
    description: "resources.favoritesDescription",
    icon: Star,
    title: "resources.favorites",
  },
];

export default function ResourcesPage() {
  const { t } = useLocalization();
  return (
    <div className={styles.pageStack}>
      <PageHeader
        breadcrumb={[{ href: "/", label: t("navigation.home") }, { label: t("resources.title") }]}
        description={t("resources.description")}
        eyebrow={t("resources.eyebrow")}
        title={t("resources.title")}
      />
      <section aria-label={t("accessibility.plannedResources")} className={styles.resourceGrid}>
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <Card key={resource.title}>
              <CardHeader>
                <div className={styles.resourceHeader}>
                  <span aria-hidden="true" className={styles.resourceIcon}>
                    <Icon size={22} strokeWidth={1.8} />
                  </span>
                  <div>
                    <CardTitle>{t(resource.title)}</CardTitle>
                    <CardDescription>{t("resources.placeholder")}</CardDescription>
                  </div>
                </div>
                <Badge tone="neutral">{t("status.plannedLabel")}</Badge>
              </CardHeader>
              <p className={styles.resourceCopy}>{t(resource.description)}</p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
