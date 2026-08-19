"use client";

import { useId, useState, type FormEvent } from "react";

import { Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import type { Project } from "@/features/projects/types";

import { createExperimentRun, ExperimentRunApiError, updateExperimentRun } from "./api";
import styles from "./experiment-runs.module.css";
import { toLocalDateTimeInput } from "./presenters";
import type { ExperimentRun, ExperimentRunWriteInput } from "./types";

type EditableStatus = ExperimentRunWriteInput["status"];
type FormState = {
  projectId: string;
  title: string;
  description: string;
  purpose: string;
  status: EditableStatus;
  plannedStart: string;
  plannedEnd: string;
};

function initialState(run: ExperimentRun | null, projectId: string | undefined, projects: Project[]): FormState {
  return run
    ? {
        projectId: run.project_id,
        title: run.title,
        description: run.description ?? "",
        purpose: run.purpose ?? "",
        status: run.status === "cancelled" ? "cancelled" : run.status === "planned" || run.status === "ready" ? run.status : "draft",
        plannedStart: toLocalDateTimeInput(run.planned_start_at),
        plannedEnd: toLocalDateTimeInput(run.planned_end_at),
      }
    : {
        projectId: projectId ?? projects[0]?.id ?? "",
        title: "",
        description: "",
        purpose: "",
        status: "draft",
        plannedStart: "",
        plannedEnd: "",
      };
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function ExperimentRunFormDialog({
  fixedProjectId,
  onOpenChange,
  onSaved,
  open,
  projects,
  run = null,
}: {
  fixedProjectId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (run: ExperimentRun) => void;
  open: boolean;
  projects: Project[];
  run?: ExperimentRun | null;
}) {
  const formId = useId();
  const [form, setForm] = useState(() => initialState(run, fixedProjectId, projects));
  const [errors, setErrors] = useState<Partial<Record<"projectId" | "title" | "plannedEnd", string>>>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!form.projectId) nextErrors.projectId = "Select a Project.";
    if (!form.title.trim()) nextErrors.title = "Experiment name is required.";
    if (form.plannedStart && form.plannedEnd && form.plannedEnd < form.plannedStart) {
      nextErrors.plannedEnd = "Planned end cannot be earlier than planned start.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const input: ExperimentRunWriteInput = {
      project_id: form.projectId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      purpose: form.purpose.trim() || null,
      status: form.status,
      planned_start_at: toIso(form.plannedStart),
      planned_end_at: toIso(form.plannedEnd),
    };
    setSubmitting(true);
    setRequestError(null);
    try {
      const saved = run
        ? await updateExperimentRun(run.id, run.revision, {
            title: input.title,
            description: input.description,
            purpose: input.purpose,
            status: input.status,
            planned_start_at: input.planned_start_at,
            planned_end_at: input.planned_end_at,
          })
        : await createExperimentRun(input);
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      setRequestError(
        error instanceof ExperimentRunApiError && error.status === 409
          ? error.message
          : error instanceof Error
            ? error.message
            : "The Experiment could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      description="Planned time stays separate from actual execution time."
      footer={
        <>
          <Button disabled={submitting} variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} form={formId} type="submit">
            {submitting ? "Saving…" : run ? "Save changes" : "Create Experiment"}
          </Button>
        </>
      }
      open={open}
      title={run ? "Edit Experiment" : "New Experiment"}
      onOpenChange={onOpenChange}
    >
      <form className={styles.form} id={formId} onSubmit={submit}>
        {requestError ? <p className={styles.requestError} role="alert">{requestError}</p> : null}
        <Field error={errors.projectId} label="Project" required>
          {(props) => (
            <Select
              {...props}
              disabled={Boolean(run || fixedProjectId)}
              value={form.projectId}
              onChange={(event) => update("projectId", event.target.value)}
            >
              <option value="">Select a Project</option>
              {projects.filter((project) => project.status !== "archived").map((project) => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field error={errors.title} label="Experiment name" required>
          {(props) => <Input {...props} value={form.title} onChange={(event) => update("title", event.target.value)} />}
        </Field>
        <Field label="Purpose">
          {(props) => <Textarea {...props} rows={3} value={form.purpose} onChange={(event) => update("purpose", event.target.value)} />}
        </Field>
        <Field label="Description">
          {(props) => <Textarea {...props} rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} />}
        </Field>
        <div className={styles.formGrid}>
          <Field label="Status">
            {(props) => (
              <Select {...props} value={form.status} onChange={(event) => update("status", event.target.value as EditableStatus)}>
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="ready">Ready</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            )}
          </Field>
          <Field label="Planned start">
            {(props) => <Input {...props} type="datetime-local" value={form.plannedStart} onChange={(event) => update("plannedStart", event.target.value)} />}
          </Field>
          <Field error={errors.plannedEnd} label="Planned end">
            {(props) => <Input {...props} type="datetime-local" value={form.plannedEnd} onChange={(event) => update("plannedEnd", event.target.value)} />}
          </Field>
        </div>
      </form>
    </Dialog>
  );
}

