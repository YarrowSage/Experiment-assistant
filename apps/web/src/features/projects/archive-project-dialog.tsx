"use client";

import { useState } from "react";

import { Button, Dialog } from "@/components/ui";

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
          "This project changed after you opened it. Refresh before archiving it.",
        );
      } else {
        setRequestError(
          error instanceof Error ? error.message : "The project could not be archived.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      description="Archive is a lifecycle change, not deletion."
      footer={
        <>
          <Button disabled={submitting} variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} variant="danger" onClick={handleArchive}>
            {submitting ? "Archiving…" : "Archive project"}
          </Button>
        </>
      }
      open={open && project !== null}
      title="Archive project?"
      onOpenChange={onOpenChange}
    >
      <p className={styles.archiveCopy}>
        <strong>{project?.title}</strong> will leave the current Projects list. The Project and its
        history will not be deleted, and it remains available through the Archived filter.
      </p>
      {requestError ? (
        <div className={styles.formError} role="alert">
          {requestError}
        </div>
      ) : null}
    </Dialog>
  );
}
