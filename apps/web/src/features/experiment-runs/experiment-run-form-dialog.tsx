"use client";

import { useId, useState, type FormEvent } from "react";

import { Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";
import type { Project } from "@/features/projects/types";
import { protocolVersionLabel } from "@/features/protocols/types";
import type { Protocol } from "@/features/protocols/types";

import { createExperimentRun, ExperimentRunApiError, updateExperimentRun } from "./api";
import styles from "./experiment-runs.module.css";
import { toLocalDateTimeInput } from "./presenters";
import type { ExperimentRun, ExperimentRunWriteInput } from "./types";

type EditableStatus = ExperimentRunWriteInput["status"];
type FormState = {
  projectId: string;
  protocolVersionId: string;
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
        protocolVersionId: run.protocol_version_id ?? "",
        title: run.title,
        description: run.description ?? "",
        purpose: run.purpose ?? "",
        status: run.status === "cancelled" ? "cancelled" : run.status === "planned" || run.status === "ready" ? run.status : "draft",
        plannedStart: toLocalDateTimeInput(run.planned_start_at),
        plannedEnd: toLocalDateTimeInput(run.planned_end_at),
      }
    : {
        projectId: projectId ?? projects[0]?.id ?? "",
        protocolVersionId: "",
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
  protocols,
  run = null,
}: {
  fixedProjectId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (run: ExperimentRun) => void;
  open: boolean;
  projects: Project[];
  protocols: Protocol[];
  run?: ExperimentRun | null;
}) {
  const { t } = useLocalization();
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
    if (!form.projectId) nextErrors.projectId = t("experiments.validation.projectRequired");
    if (!form.title.trim()) nextErrors.title = t("experiments.validation.nameRequired");
    if (form.plannedStart && form.plannedEnd && form.plannedEnd < form.plannedStart) {
      nextErrors.plannedEnd = t("experiments.validation.dateOrder");
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const input: ExperimentRunWriteInput = {
      project_id: form.projectId,
      protocol_version_id: form.protocolVersionId || null,
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
            protocol_version_id: input.protocol_version_id,
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
          : presentError(error, t, "experiments.saveError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      description={t("experiments.form.description")}
      footer={
        <>
          <Button disabled={submitting} variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={submitting} form={formId} type="submit">
            {submitting ? t("common.saving") : run ? t("common.saveChanges") : t("experiments.form.create")}
          </Button>
        </>
      }
      open={open}
      title={run ? t("experiments.form.editTitle") : t("experiments.form.newTitle")}
      onOpenChange={onOpenChange}
    >
      <form className={styles.form} id={formId} onSubmit={submit}>
        {requestError ? <p className={styles.requestError} role="alert">{requestError}</p> : null}
        <Field error={errors.projectId} label={t("common.project")} required>
          {(props) => (
            <Select
              {...props}
              disabled={Boolean(run || fixedProjectId)}
              value={form.projectId}
              onChange={(event) => {
                update("projectId", event.target.value);
                update("protocolVersionId", "");
              }}
            >
              <option value="">{t("experiments.form.projectSelect")}</option>
              {projects.filter((project) => project.status !== "archived").map((project) => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          hint={t("experiments.form.protocolHint")}
          label={t("experiments.form.protocolVersion")}
        >
          {(props) => (
            <Select
              {...props}
              value={form.protocolVersionId}
              onChange={(event) => update("protocolVersionId", event.target.value)}
            >
              <option value="">{t("experiments.form.noProtocol")}</option>
              {protocols
                .filter((protocol) => protocol.project_id === form.projectId)
                .flatMap((protocol) =>
                  protocol.versions
                    .filter(
                      (version) =>
                        version.status === "published" ||
                        version.id === run?.protocol_version_id,
                    )
                    .map((version) => (
                      <option key={version.id} value={version.id}>
                        {protocolVersionLabel(protocol, version, t)}
                      </option>
                    )),
                )}
            </Select>
          )}
        </Field>
        <Field error={errors.title} label={t("experiments.form.name")} required>
          {(props) => <Input {...props} value={form.title} onChange={(event) => update("title", event.target.value)} />}
        </Field>
        <Field label={t("common.purpose")}>
          {(props) => <Textarea {...props} rows={3} value={form.purpose} onChange={(event) => update("purpose", event.target.value)} />}
        </Field>
        <Field label={t("common.description")}>
          {(props) => <Textarea {...props} rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} />}
        </Field>
        <div className={styles.formGrid}>
          <Field label={t("common.status")}>
            {(props) => (
              <Select {...props} value={form.status} onChange={(event) => update("status", event.target.value as EditableStatus)}>
                <option value="draft">{t("status.draft")}</option>
                <option value="planned">{t("status.planned")}</option>
                <option value="ready">{t("status.ready")}</option>
                <option value="cancelled">{t("status.cancelled")}</option>
              </Select>
            )}
          </Field>
          <Field label={t("experiments.form.plannedStart")}>
            {(props) => <Input {...props} type="datetime-local" value={form.plannedStart} onChange={(event) => update("plannedStart", event.target.value)} />}
          </Field>
          <Field error={errors.plannedEnd} label={t("experiments.form.plannedEnd")}>
            {(props) => <Input {...props} type="datetime-local" value={form.plannedEnd} onChange={(event) => update("plannedEnd", event.target.value)} />}
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
