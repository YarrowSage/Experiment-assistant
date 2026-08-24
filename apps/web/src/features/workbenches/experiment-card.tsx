"use client";

import { ArrowRight, CircleCheck, CircleDashed, Clock3, PackageOpen } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";

import { RecordCard, type RecordCardMetadata } from "./record-card";
import styles from "./workbenches.module.css";

export type WorkbenchLifecycleStatus =
  | "draft"
  | "planned"
  | "in-progress"
  | "completed"
  | "archived";

type ExperimentCardProps = {
  href?: string;
  name: string;
  nextTask?: string;
  progress?: number;
  project?: string;
  status: WorkbenchLifecycleStatus;
  updatedAt?: string;
};

const statusPresentation = {
  archived: { icon: PackageOpen, key: "status.archived", tone: "neutral" },
  completed: { icon: CircleCheck, key: "status.completed", tone: "success" },
  draft: { icon: CircleDashed, key: "status.draft", tone: "neutral" },
  "in-progress": { icon: Clock3, key: "status.inProgress", tone: "warning" },
  planned: { icon: Clock3, key: "status.planned", tone: "accent" },
} as const;

export function ExperimentCard({
  href,
  name,
  nextTask,
  progress,
  project,
  status,
  updatedAt,
}: ExperimentCardProps) {
  const { t } = useLocalization();
  const presentation = statusPresentation[status];
  const Icon = presentation.icon;
  const metadata: RecordCardMetadata[] = [];

  if (project) metadata.push({ label: t("workbench.record.project"), value: project });
  if (updatedAt) metadata.push({ label: t("workbench.record.updatedAt"), value: updatedAt });
  if (nextTask) metadata.push({ label: t("workbench.record.nextTask"), value: nextTask });
  if (progress !== undefined) {
    metadata.push({
      label: t("workbench.record.progress"),
      value: (
        <span aria-label={t("accessibility.progress", { progress })} className={styles.progressValue}>
          {progress}%
        </span>
      ),
    });
  }

  return (
    <RecordCard
      action={
        href ? (
          <Link className={styles.cardAction} href={href}>
            {t("workbench.record.open")}
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        ) : undefined
      }
      metadata={metadata}
      status={
        <Badge tone={presentation.tone}>
          <Icon aria-hidden="true" size={13} strokeWidth={2} />
          {t(presentation.key)}
        </Badge>
      }
      title={name}
    />
  );
}
