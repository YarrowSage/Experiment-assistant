"use client";

import { CircleCheck, Clock3 } from "lucide-react";

import { Badge, PageHeader } from "@/components/ui";
import type { MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

import type { WorkbenchStatus } from "./registry";
import styles from "./workbenches.module.css";

type BreadcrumbDefinition = {
  href?: string;
  labelKey: MessageKey;
};

type WorkbenchHeaderProps = {
  breadcrumb: readonly BreadcrumbDefinition[];
  descriptionKey: MessageKey;
  eyebrowKey: MessageKey;
  status?: WorkbenchStatus;
  titleKey: MessageKey;
};

export function WorkbenchHeader({
  breadcrumb,
  descriptionKey,
  eyebrowKey,
  status,
  titleKey,
}: WorkbenchHeaderProps) {
  const { t } = useLocalization();

  return (
    <PageHeader
      action={
        status ? (
          <div className={styles.headerStatus}>
            <WorkbenchStatusBadge status={status} />
          </div>
        ) : undefined
      }
      breadcrumb={breadcrumb.map((item) => ({ href: item.href, label: t(item.labelKey) }))}
      description={t(descriptionKey)}
      eyebrow={t(eyebrowKey)}
      title={t(titleKey)}
    />
  );
}

export function WorkbenchStatusBadge({ status }: { status: WorkbenchStatus }) {
  const { t } = useLocalization();
  const available = status === "available";
  const Icon = available ? CircleCheck : Clock3;

  return (
    <Badge tone={available ? "success" : "neutral"}>
      <Icon aria-hidden="true" size={13} strokeWidth={2} />
      {t(available ? "workbench.status.available" : "workbench.status.planned")}
    </Badge>
  );
}
