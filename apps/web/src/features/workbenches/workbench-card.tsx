"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";

import type { WorkbenchDefinition } from "./registry";
import { WorkbenchStatusBadge } from "./workbench-header";
import styles from "./workbenches.module.css";

export function WorkbenchCard({ workbench }: { workbench: WorkbenchDefinition }) {
  const { t } = useLocalization();
  const Icon = workbench.icon;

  return (
    <Card className={styles.workbenchCard}>
      <CardHeader>
        <div className={styles.cardIdentity}>
          <span aria-hidden="true" className={styles.workbenchIcon}>
            <Icon size={24} strokeWidth={1.8} />
          </span>
          <div>
            <CardTitle>{t(workbench.nameKey)}</CardTitle>
            <CardDescription>{t("workbench.card.foundationLabel")}</CardDescription>
          </div>
        </div>
        <WorkbenchStatusBadge status={workbench.status} />
      </CardHeader>
      <CardContent className={styles.cardContent}>
        <p>{t(workbench.descriptionKey)}</p>
      </CardContent>
      <CardFooter>
        <Link className={styles.cardAction} href={workbench.route}>
          {t("workbench.card.open")}
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </CardFooter>
    </Card>
  );
}
