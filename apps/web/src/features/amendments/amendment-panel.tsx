"use client";

import { FilePenLine, History } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, EmptyState, ErrorState, Field, Input, LoadingState, Select, Textarea } from "@/components/ui";
import type { RunExecution, RunStepRecord } from "@/features/execution/types";

import { createAmendment, listAmendments } from "./api";
import styles from "./amendments.module.css";
import type { Amendment, AmendmentInput, AmendmentTargetType } from "./types";

type Target = {
  key: string;
  label: string;
  targetType: AmendmentTargetType;
  targetId: string;
  field: string;
  value: string | null;
  revision: number;
  inputType: "text" | "datetime-local";
};

export function AmendmentPanel({
  execution,
  onExecutionChanged,
}: {
  execution: RunExecution;
  onExecutionChanged: (execution: RunExecution) => void;
}) {
  const [history, setHistory] = useState<Amendment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHistory(await listAmendments(execution.run.id));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Amendment history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [execution.run.id]);

  useEffect(() => {
    let ignore = false;
    async function loadHistory() {
      try {
        const loaded = await listAmendments(execution.run.id);
        if (!ignore) {
          setHistory(loaded);
          setError(null);
        }
      } catch (cause) {
        if (!ignore) setError(cause instanceof Error ? cause.message : "Amendment history could not be loaded.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadHistory();
    return () => { ignore = true; };
  }, [execution.run.id]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Corrections and amendments</CardTitle>
          <p className={styles.cardDescription}>Completed records are corrected transparently; the prior value remains in history.</p>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}><FilePenLine aria-hidden="true" size={17} />Amend record</Button>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingState label="Loading amendment history" /> : error && !history ? <ErrorState title="History could not be loaded" description={error} onRetry={() => void load()} /> : history?.length ? <AmendmentHistory amendments={history} /> : <EmptyState icon={<History size={22} />} title="No amendments" description="The completed record has not been corrected." />}
        {error && history ? <p className={styles.requestError} role="alert">{error}</p> : null}
        <p className={styles.integrityNote}>This is transparent correction history. It is not a claim of GLP, GxP, or regulatory compliance.</p>
      </CardContent>
      <AmendmentDialog
        execution={execution}
        onAmended={(updated, amendment) => {
          onExecutionChanged(updated);
          setHistory((current) => [amendment, ...(current ?? [])]);
          setOpen(false);
        }}
        onOpenChange={setOpen}
        open={open}
      />
    </Card>
  );
}

function AmendmentDialog({ execution, onAmended, onOpenChange, open }: { execution: RunExecution; onAmended: (execution: RunExecution, amendment: Amendment) => void; onOpenChange: (open: boolean) => void; open: boolean }) {
  const targets = useMemo(() => buildTargets(execution), [execution]);
  const [targetKey, setTargetKey] = useState(targets[0]?.key ?? "");
  const [corrected, setCorrected] = useState("");
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = targets.find((item) => item.key === targetKey) ?? targets[0];

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setTargetKey(targets[0]?.key ?? "");
      setCorrected("");
      setReason("");
      setReviewing(false);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  function review() {
    if (!target || !corrected.trim() || !reason.trim()) {
      setError("Choose content, enter its correction, and provide a reason.");
      return;
    }
    setError(null);
    setReviewing(true);
  }

  async function confirm() {
    if (!target) return;
    setSaving(true);
    setError(null);
    const input: AmendmentInput = {
      target_type: target.targetType,
      target_id: target.targetId,
      target_field: target.field,
      corrected_value: target.inputType === "datetime-local" ? new Date(corrected).toISOString() : corrected.trim(),
      reason: reason.trim(),
      expected_target_revision: target.revision,
    };
    try {
      const result = await createAmendment(execution.run.id, input);
      setReviewing(false);
      setCorrected("");
      setReason("");
      onAmended(result.execution, result.amendment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The amendment could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      description={reviewing ? "Review the original value, correction, and reason before recording this amendment." : "Choose the completed content to correct. The prior value will remain visible in history."}
      footer={reviewing ? <><Button disabled={saving} variant="secondary" onClick={() => setReviewing(false)}>Back</Button><Button disabled={saving} onClick={() => void confirm()}>{saving ? "Recording…" : "Confirm amendment"}</Button></> : <><Button variant="secondary" onClick={() => changeOpen(false)}>Cancel</Button><Button onClick={review}>Review correction</Button></>}
      onOpenChange={changeOpen}
      open={open}
      title={reviewing ? "Review amendment" : "Amend completed record"}
    >
      {reviewing && target ? (
        <dl className={styles.reviewList}>
          <div><dt>Content</dt><dd>{target.label}</dd></div>
          <div><dt>Original</dt><dd>{displayValue(target.value)}</dd></div>
          <div><dt>Corrected</dt><dd>{displayValue(corrected)}</dd></div>
          <div><dt>Reason</dt><dd>{reason.trim()}</dd></div>
        </dl>
      ) : (
        <div className={styles.dialogStack}>
          <Field label="Content to correct" required>{(props) => <Select {...props} value={target?.key ?? ""} onChange={(event) => { setTargetKey(event.target.value); setCorrected(""); }}><optgroup label="Experiment">{targets.filter((item) => item.targetType === "experiment_run").map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</optgroup>{execution.steps.length ? <optgroup label="Run steps">{targets.filter((item) => item.targetType === "run_step_record").map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</optgroup> : null}</Select>}</Field>
          {target ? <div className={styles.originalValue}><span>Original</span><strong>{displayValue(target.value)}</strong></div> : null}
          <Field label="Corrected value" required>{(props) => target?.inputType === "datetime-local" ? <Input {...props} type="datetime-local" value={corrected} onChange={(event) => setCorrected(event.target.value)} /> : <Textarea {...props} rows={3} value={corrected} onChange={(event) => setCorrected(event.target.value)} />}</Field>
          <Field label="Correction reason" hint="Explain why the completed record needs correction." required>{(props) => <Textarea {...props} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />}</Field>
        </div>
      )}
      {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
    </Dialog>
  );
}

function AmendmentHistory({ amendments }: { amendments: Amendment[] }) {
  return <ol className={styles.historyList}>{amendments.map((amendment) => <li key={amendment.id}><div className={styles.historyHeading}><strong>{fieldLabel(amendment.target_field)}</strong><span>Revision {amendment.prior_revision} → {amendment.resulting_revision}</span></div><dl><div><dt>Original</dt><dd>{displayValue(amendment.original_value)}</dd></div><div><dt>Corrected</dt><dd>{displayValue(amendment.corrected_value)}</dd></div><div><dt>Reason</dt><dd>{amendment.reason}</dd></div><div><dt>Time</dt><dd><time dateTime={amendment.created_at}>{formatDate(amendment.created_at)}</time></dd></div></dl></li>)}</ol>;
}

function buildTargets(execution: RunExecution): Target[] {
  const runTargets: Target[] = [
    runTarget(execution, "title", "Experiment title", "text"),
    runTarget(execution, "description", "Description", "text"),
    runTarget(execution, "purpose", "Purpose", "text"),
    runTarget(execution, "completion_note", "Completion note", "text"),
    runTarget(execution, "actual_start_at", "Actual start", "datetime-local"),
    runTarget(execution, "actual_end_at", "Actual end", "datetime-local"),
  ];
  const stepTargets = execution.steps.flatMap((step) => [
    stepTarget(step, "actual_start_at", `Step ${step.position}: ${step.title_snapshot} — actual start`),
    stepTarget(step, "actual_end_at", `Step ${step.position}: ${step.title_snapshot} — actual end`),
  ]);
  return [...runTargets, ...stepTargets];
}

function runTarget(execution: RunExecution, field: "title" | "description" | "purpose" | "completion_note" | "actual_start_at" | "actual_end_at", label: string, inputType: Target["inputType"]): Target {
  return { key: `experiment_run:${field}`, label, targetType: "experiment_run", targetId: execution.run.id, field, value: execution.run[field], revision: execution.run.revision, inputType };
}

function stepTarget(step: RunStepRecord, field: "actual_start_at" | "actual_end_at", label: string): Target {
  return { key: `run_step_record:${step.id}:${field}`, label, targetType: "run_step_record", targetId: step.id, field, value: step[field], revision: step.revision, inputType: "datetime-local" };
}

function fieldLabel(value: string) { return value.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase()); }
function displayValue(value: string | null) { return value?.trim() || "Not recorded"; }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
