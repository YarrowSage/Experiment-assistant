"use client";

import { useState } from "react";

import { Button, Dialog } from "@/components/ui";

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function archive() {
    setSubmitting(true);
    setError(null);
    try {
      onArchived(await archiveExperimentRun(run.id, run.revision));
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Experiment could not be archived.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Dialog
      description="The scientific record will remain retrievable and will not be deleted."
      footer={
        <>
          <Button disabled={submitting} variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={submitting} variant="danger" onClick={() => void archive()}>
            {submitting ? "Archiving…" : "Archive Experiment"}
          </Button>
        </>
      }
      open={open}
      title="Archive Experiment?"
      onOpenChange={onOpenChange}
    >
      <p>Archive <strong>{run.title}</strong>? It will move out of current views.</p>
      {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
    </Dialog>
  );
}
