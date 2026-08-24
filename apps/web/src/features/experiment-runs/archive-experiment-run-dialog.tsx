"use client";

import { useState } from "react";

import { Button, Dialog } from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { archiveExperimentRun } from "./api";
import styles from "./experiment-runs.module.css";
import type { ExperimentRun } from "./types";

export function ArchiveExperimentRunDialog({
  onArchived,
  onOpenChange,
  open,
  run,
}: {
  onArchived: (run: ExperimentRun) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  run: ExperimentRun;
}) {
  const { t } = useLocalization();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function archive() {
    setSubmitting(true);
    setError(null);
    try {
      onArchived(await archiveExperimentRun(run.id, run.revision));
      onOpenChange(false);
    } catch (cause) {
      setError(presentError(cause, t, "experiments.archiveError"));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Dialog
      description={t("experiments.archiveDescription")}
      footer={
        <>
          <Button disabled={submitting} variant="secondary" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button disabled={submitting} variant="danger" onClick={() => void archive()}>
            {submitting ? t("projects.archiving") : t("experiments.archiveAction")}
          </Button>
        </>
      }
      open={open}
      title={t("experiments.archiveTitle")}
      onOpenChange={onOpenChange}
    >
      <p>{t("experiments.archiveBody", { title: run.title })}</p>
      {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
    </Dialog>
  );
}
