"use client";

import { useState } from "react";

import { Button, Dialog } from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { archiveProject, ProjectApiError } from "./api";
import styles from "./projects.module.css";
import type { Project } from "./types";

export function ArchiveProjectDialog({
  onArchived,
  onOpenChange,
  open,
  project,
}: {
  onArchived: (project: Project) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: Project | null;
}) {
  const { t } = useLocalization();
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function handleArchive() {
    if (!project) return;
    setSubmitting(true);
    setRequestError(null);
    try {
      const archived = await archiveProject(project.id, project.revision);
      onArchived(archived);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ProjectApiError && error.status === 409) {
        setRequestError(
          t("projects.archiveConflict"),
        );
      } else {
        setRequestError(presentError(error, t, "projects.archiveError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      description={t("projects.archiveDescription")}
      footer={
        <>
          <Button disabled={submitting} variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={submitting} variant="danger" onClick={handleArchive}>
            {submitting ? t("projects.archiving") : t("projects.archiveAction")}
          </Button>
        </>
      }
      open={open && project !== null}
      title={t("projects.archiveTitle")}
      onOpenChange={onOpenChange}
    >
      <p className={styles.archiveCopy}>
        {project ? t("projects.archiveBody", { title: project.title }) : null}
      </p>
      {requestError ? (
        <div className={styles.formError} role="alert">
          {requestError}
        </div>
      ) : null}
    </Dialog>
  );
}
