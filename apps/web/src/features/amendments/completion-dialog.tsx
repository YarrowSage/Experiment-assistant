"use client";

import { useMemo, useState } from "react";

import { Button, Dialog, Field, Textarea } from "@/components/ui";
import type { RunExecution } from "@/features/execution/types";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { completeExperiment } from "./api";
import styles from "./amendments.module.css";

export function CompletionDialog({
  execution,
  onCompleted,
  onOpenChange,
  open,
}: {
  execution: RunExecution;
  onCompleted: (execution: RunExecution) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { t } = useLocalization();
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const incompleteRequired = useMemo(
    () => execution.steps.filter((step) => step.required_snapshot && step.status !== "completed"),
    [execution.steps],
  );
  const incompleteOptional = useMemo(
    () => execution.steps.filter((step) => !step.required_snapshot && step.status !== "completed"),
    [execution.steps],
  );
  const activeStep = execution.steps.find((step) => step.status === "active");

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setNote("");
      setAcknowledged(false);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function complete() {
    if (activeStep) {
      setError(t("completion.activeStepError"));
      return;
    }
    if (incompleteRequired.length && !acknowledged) {
      setError(t("completion.acknowledgeError"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const completed = await completeExperiment(
        execution.run.id,
        execution.run.revision,
        note,
        acknowledged,
      );
      onCompleted(completed);
      changeOpen(false);
    } catch (cause) {
      setError(presentError(cause, t, "completion.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      description={t("completion.description")}
      footer={
        <>
          <Button disabled={saving} variant="secondary" onClick={() => changeOpen(false)}>{t("common.cancel")}</Button>
          <Button disabled={saving || Boolean(activeStep)} onClick={() => void complete()}>
            {saving ? t("completion.completing") : t("completion.title")}
          </Button>
        </>
      }
      onOpenChange={changeOpen}
      open={open}
      title={t("completion.title")}
    >
      <div className={styles.dialogStack}>
        <div className={styles.completionSummary}>
          <strong>{t("completion.stepsCompleted", { completed: execution.steps.filter((step) => step.status === "completed").length, total: execution.steps.length })}</strong>
          {incompleteOptional.length ? <p>{t(incompleteOptional.length === 1 ? "completion.optionalIncompleteOne" : "completion.optionalIncompleteMany", { count: incompleteOptional.length })}</p> : null}
          {activeStep ? <p className={styles.warning} role="alert">{t("completion.activeStep", { title: activeStep.title_snapshot })}</p> : null}
        </div>
        {incompleteRequired.length ? (
          <div className={styles.requiredWarning}>
            <strong>{t(incompleteRequired.length === 1 ? "completion.requiredIncompleteOne" : "completion.requiredIncompleteMany", { count: incompleteRequired.length })}</strong>
            <ul>{incompleteRequired.map((step) => <li key={step.id}>{step.title_snapshot}</li>)}</ul>
            <label className={styles.checkbox}>
              <input checked={acknowledged} type="checkbox" onChange={(event) => setAcknowledged(event.target.checked)} />
              {t("completion.acknowledge")}
            </label>
          </div>
        ) : null}
        <Field label={t("completion.note")} hint={t("completion.noteHint")}>
          {(props) => <Textarea {...props} rows={4} value={note} onChange={(event) => setNote(event.target.value)} />}
        </Field>
        {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
      </div>
    </Dialog>
  );
}
