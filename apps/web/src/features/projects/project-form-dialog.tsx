"use client";

import { useId, useState, type FormEvent } from "react";

import { Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";

import { createProject, ProjectApiError, updateProject } from "./api";
import styles from "./projects.module.css";
import type { Project, ProjectStatus, ProjectWriteInput } from "./types";

type EditableStatus = Exclude<ProjectStatus, "archived">;

type FormState = {
  title: string;
  description: string;
  objective: string;
  status: EditableStatus;
  startDate: string;
  endDate: string;
  tags: string;
};

type FormErrors = Partial<Record<"title" | "endDate", string>>;

const emptyForm: FormState = {
  title: "",
  description: "",
  objective: "",
  status: "planning",
  startDate: "",
  endDate: "",
  tags: "",
};

const statusLabels: Record<EditableStatus, string> = {
  planning: "Planning",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const allowedStatuses: Record<EditableStatus, readonly EditableStatus[]> = {
  planning: ["planning", "active", "paused", "completed"],
  active: ["active", "paused", "completed"],
  paused: ["paused", "active", "completed"],
  completed: ["completed"],
};

function stateFromProject(project: Project | null): FormState {
  if (!project || project.status === "archived") return emptyForm;
  return {
    title: project.title,
    description: project.description ?? "",
    objective: project.objective ?? "",
    status: project.status,
    startDate: project.start_date ?? "",
    endDate: project.end_date ?? "",
    tags: project.tags.join(", "),
  };
}

function parseTags(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag) return false;
      const identity = tag.toLocaleLowerCase();
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
}

function toWriteInput(form: FormState): ProjectWriteInput {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    objective: form.objective.trim() || null,
    status: form.status,
    start_date: form.startDate || null,
    end_date: form.endDate || null,
    tags: parseTags(form.tags),
  };
}

export function ProjectFormDialog({
  onOpenChange,
  onSaved,
  open,
  project = null,
}: {
  onOpenChange: (open: boolean) => void;
  onSaved: (project: Project) => void;
  open: boolean;
  project?: Project | null;
}) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(() => stateFromProject(project));
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const editing = project !== null;

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!form.title.trim()) nextErrors.title = "Project name is required.";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = "End date cannot be earlier than start date.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setRequestError(null);
    try {
      const saved = editing
        ? await updateProject(project.id, project.revision, toWriteInput(form))
        : await createProject(toWriteInput(form));
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ProjectApiError && error.status === 409) {
        setRequestError(
          "This project changed after you opened it. Refresh the project before trying again.",
        );
      } else {
        setRequestError(
          error instanceof Error ? error.message : "The project could not be saved.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const statuses = project && project.status !== "archived" ? allowedStatuses[project.status] : allowedStatuses.planning;

  return (
    <Dialog
      description={
        editing
          ? "Update the planning record. Changes use revision checks to prevent silent overwrites."
          : "Create a real Project in the local Default Workspace."
      }
      footer={
        <>
          <Button disabled={submitting} variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} form={formId} type="submit">
            {submitting ? (editing ? "Saving changes…" : "Creating project…") : editing ? "Save changes" : "Create project"}
          </Button>
        </>
      }
      open={open}
      title={editing ? "Edit project" : "New project"}
      onOpenChange={onOpenChange}
    >
      <form className={styles.projectForm} id={formId} onSubmit={handleSubmit}>
        {requestError ? (
          <div className={styles.formError} role="alert">
            {requestError}
          </div>
        ) : null}
        <Field error={errors.title} label="Project name" required>
          {(props) => (
            <Input
              {...props}
              autoComplete="off"
              maxLength={200}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          )}
        </Field>
        <Field label="Description">
          {(props) => (
            <Textarea
              {...props}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          )}
        </Field>
        <Field label="Objective">
          {(props) => (
            <Textarea
              {...props}
              value={form.objective}
              onChange={(event) => updateField("objective", event.target.value)}
            />
          )}
        </Field>
        <div className={styles.formGrid}>
          <Field label="Status">
            {(props) => (
              <Select
                {...props}
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as EditableStatus)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field hint="Optional" label="Tags">
            {(props) => (
              <Input
                {...props}
                placeholder="e.g. CCK-8, pilot"
                value={form.tags}
                onChange={(event) => updateField("tags", event.target.value)}
              />
            )}
          </Field>
          <Field label="Start date">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={form.startDate}
                onChange={(event) => updateField("startDate", event.target.value)}
              />
            )}
          </Field>
          <Field error={errors.endDate} label="End date">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={form.endDate}
                onChange={(event) => updateField("endDate", event.target.value)}
              />
            )}
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
