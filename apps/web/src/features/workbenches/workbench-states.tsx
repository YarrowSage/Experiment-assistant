"use client";

import { Boxes, Construction } from "lucide-react";

import { Button, EmptyState, LoadingState } from "@/components/ui";
import type { MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

export function EmptyWorkbenchState({ action }: { action?: () => void }) {
  const { t } = useLocalization();

  return (
    <EmptyState
      action={
        action ? (
          <Button variant="secondary" onClick={action}>
            {t("workbench.empty.action")}
          </Button>
        ) : undefined
      }
      description={t("workbench.empty.description")}
      icon={<Boxes size={24} strokeWidth={1.8} />}
      title={t("workbench.empty.title")}
    />
  );
}

export function PlannedWorkbenchState({ descriptionKey }: { descriptionKey: MessageKey }) {
  const { t } = useLocalization();

  return (
    <EmptyState
      description={t(descriptionKey)}
      icon={<Construction size={24} strokeWidth={1.8} />}
      title={t("workbench.planned.title")}
    />
  );
}

export function LoadingWorkbenchState({ labelKey }: { labelKey?: MessageKey }) {
  const { t } = useLocalization();

  return <LoadingState label={t(labelKey ?? "workbench.loading")} />;
}
