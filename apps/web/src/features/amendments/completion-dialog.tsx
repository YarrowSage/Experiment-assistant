"use client";

import { useMemo, useState } from "react";

import { Button, Dialog, Field, Textarea } from "@/components/ui";
import type { RunExecution } from "@/features/execution/types";

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
      setError("Complete the active step before completing the Experiment.");
      return;
    }
    if (incompleteRequired.length && !acknowledged) {
      setError("Acknowledge the incomplete required steps before continuing.");
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
      setError(cause instanceof Error ? cause.message : "The Experiment could not be completed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      description="Completion is an explicit research decision. It is separate from completing individual steps."
      footer={
        <>
          <Button disabled={saving} variant="secondary" onClick={() => changeOpen(false)}>Cancel</Button>
          <Button disabled={saving || Boolean(activeStep)} onClick={() => void complete()}>
            {saving ? "Completing…" : "Complete Experiment"}
          </Button>
        </>
      }
      onOpenChange={changeOpen}
      open={open}
      title="Complete Experiment"
    >
      <div className={styles.dialogStack}>
        <div className={styles.completionSummary}>
          <strong>{execution.steps.filter((step) => step.status === "completed").length} of {execution.steps.length} steps completed</strong>
          {incompleteOptional.length ? <p>{incompleteOptional.length} optional step{incompleteOptional.length === 1 ? " is" : "s are"} still incomplete. Optional steps do not block completion.</p> : null}
          {activeStep ? <p className={styles.warning} role="alert">“{activeStep.title_snapshot}” is active. Complete it first.</p> : null}
        </div>
        {incompleteRequired.length ? (
          <div className={styles.requiredWarning}>
            <strong>{incompleteRequired.length} required step{incompleteRequired.length === 1 ? " is" : "s are"} incomplete</strong>
            <ul>{incompleteRequired.map((step) => <li key={step.id}>{step.title_snapshot}</li>)}</ul>
            <label className={styles.checkbox}>
              <input checked={acknowledged} type="checkbox" onChange={(event) => setAcknowledged(event.target.checked)} />
              I acknowledge that this Experiment will be completed with required work unfinished.
            </label>
          </div>
        ) : null}
        <Field label="Completion note" hint="Optional. Record a concise conclusion or completion context.">
          {(props) => <Textarea {...props} rows={4} value={note} onChange={(event) => setNote(event.target.value)} />}
        </Field>
        {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
      </div>
    </Dialog>
  );
}
