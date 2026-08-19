"use client";

import { ArrowLeft, ArrowRight, Check, CirclePause, CirclePlay, Clock3, Flag, ListChecks, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ErrorState, LoadingState } from "@/components/ui";
import { AmendmentPanel } from "@/features/amendments/amendment-panel";
import { CompletionDialog } from "@/features/amendments/completion-dialog";
import { EvidencePanel } from "@/features/evidence/evidence-panel";
import type { ExperimentRun } from "@/features/experiment-runs/types";

import { completeRunStep, getRunExecution, pauseRunExecution, resumeRunExecution, startRunExecution, startRunStep } from "./api";
import styles from "./execution.module.css";
import type { RunExecution, RunStepRecord } from "./types";

export function ExecutionPanel({ run, onRunChanged }: { run: ExperimentRun; onRunChanged: (run: ExperimentRun) => void }) {
  const [execution, setExecution] = useState<RunExecution | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { setExecution(await getRunExecution(run.id)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Execution could not be loaded."); }
    finally { setLoading(false); }
  }, [run.id]);

  useEffect(() => {
    let ignore = false;
    async function loadExecution() {
      try {
        const loaded = await getRunExecution(run.id);
        if (!ignore) { setExecution(loaded); setError(null); }
      } catch (cause) {
        if (!ignore) setError(cause instanceof Error ? cause.message : "Execution could not be loaded.");
      } finally { if (!ignore) setLoading(false); }
    }
    void loadExecution();
    return () => { ignore = true; };
  }, [run.id]);

  async function mutate(action: () => Promise<RunExecution>, success: string) {
    setWorking(true); setError(null); setFeedback(null);
    try {
      const updated = await action();
      setExecution(updated); onRunChanged(updated.run); setFeedback(success);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Execution could not be updated."); }
    finally { setWorking(false); }
  }

  if (loading) return <Card><LoadingState label="Loading execution" /></Card>;
  if (error && !execution) return <Card><ErrorState title="Execution could not be loaded" description={error} onRetry={() => void load()} /></Card>;
  const current = execution ?? { run, steps: [] };

  if (["draft", "cancelled", "archived"].includes(current.run.status)) {
    return <Card><div className={styles.notReady}><ListChecks aria-hidden="true" size={22} /><div><h2>Execution is not available</h2><p>{current.run.status === "draft" ? "Set this Experiment to Planned or Ready before starting." : "This Experiment is not in an executable state."}</p></div></div></Card>;
  }
  if (["planned", "ready"].includes(current.run.status)) {
    return <Card className={styles.startCard}><div><span className={styles.eyebrow}>Execution</span><h2>Ready to begin?</h2><p>Starting records the actual UTC start time and creates stable step snapshots. Planned time remains unchanged.</p></div><Button className={styles.largeAction} disabled={working} onClick={() => void mutate(() => startRunExecution(run.id, current.run.revision), "Experiment started") }><CirclePlay aria-hidden="true" size={21} />{working ? "Starting…" : "Start Experiment"}</Button></Card>;
  }

  const active = current.steps.find((step) => step.status === "active");
  const nextPending = current.steps.find((step) => step.status === "pending");
  const defaultStep = active ?? nextPending ?? current.steps.at(-1);
  const selected = current.steps.find((step) => step.id === selectedId) ?? defaultStep;
  const selectedIndex = selected ? current.steps.findIndex((step) => step.id === selected.id) : -1;
  const completedCount = current.steps.filter((step) => step.status === "completed").length;
  const progress = current.steps.length ? Math.round((completedCount / current.steps.length) * 100) : 0;
  const paused = current.run.status === "paused";
  const completed = current.run.status === "completed";

  return <section aria-labelledby="execution-heading" className={styles.execution}>
    <Card className={styles.executionHeader}><div><span className={styles.eyebrow}>{completed ? "Completed record" : "Live execution"}</span><h2 id="execution-heading">{completed ? "Experiment completed" : paused ? "Experiment paused" : "Experiment in progress"}</h2><p>{completedCount} of {current.steps.length} steps completed{completed && current.run.completed_at ? ` · Completed ${formatDate(current.run.completed_at)}` : ""}</p></div><div className={styles.runControls}><Badge tone={completed ? "neutral" : paused ? "warning" : "success"}>{completed ? "Completed" : paused ? "Paused" : "Running"}</Badge>{completed ? null : paused ? <Button disabled={working} onClick={() => void mutate(() => resumeRunExecution(run.id, current.run.revision), "Experiment resumed")}><RotateCcw aria-hidden="true" size={18} />Resume</Button> : <Button disabled={working} variant="secondary" onClick={() => void mutate(() => pauseRunExecution(run.id, current.run.revision), "Experiment paused")}><CirclePause aria-hidden="true" size={18} />Pause</Button>}{completed ? null : <Button disabled={working} onClick={() => setCompletionOpen(true)}><Flag aria-hidden="true" size={18} />Complete Experiment</Button>}</div><div aria-label={`${progress}% complete`} className={styles.progressTrack} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div></Card>
    {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
    {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    {completed && current.run.completion_note ? <Card className={styles.completionNote}><strong>Completion note</strong><p>{current.run.completion_note}</p></Card> : null}
    {selected ? <CurrentStep step={selected} paused={paused} readOnly={completed} working={working} canStart={selected.id === nextPending?.id && !active} onStart={() => void mutate(() => startRunStep(selected.id, current.run.revision, selected.revision), "Step started")} onComplete={() => void mutate(() => completeRunStep(selected.id, current.run.revision, selected.revision), "Step completed")} /> : <Card><div className={styles.notReady}><ListChecks aria-hidden="true" size={22} /><div><h2>No Protocol steps</h2><p>{completed ? "This completed Experiment has no Protocol step history." : "This generic Experiment has started without a Protocol. Step execution is unavailable."}</p></div></div></Card>}
    {selected ? <div className={styles.stepNavigation}><Button disabled={selectedIndex <= 0} variant="secondary" onClick={() => setSelectedId(current.steps[selectedIndex - 1]?.id ?? null)}><ArrowLeft aria-hidden="true" size={18} />Previous</Button><span>Step {selectedIndex + 1} of {current.steps.length}</span><Button disabled={selectedIndex >= current.steps.length - 1} variant="secondary" onClick={() => setSelectedId(current.steps[selectedIndex + 1]?.id ?? null)}>Next<ArrowRight aria-hidden="true" size={18} /></Button></div> : null}
    {current.steps.length ? <Card><CardHeader><CardTitle>All steps</CardTitle></CardHeader><CardContent><ol className={styles.allSteps}>{current.steps.map((step) => <li key={step.id}><button aria-current={selected?.id === step.id ? "step" : undefined} type="button" onClick={() => setSelectedId(step.id)}><span>{step.position}</span><span><strong>{step.title_snapshot}</strong><small>{step.status}</small></span>{step.status === "completed" ? <Check aria-hidden="true" size={18} /> : null}</button></li>)}</ol></CardContent></Card> : null}
    <EvidencePanel runId={run.id} runStepId={selected?.id ?? null} />
    {completed ? <AmendmentPanel execution={current} onExecutionChanged={(updated) => { setExecution(updated); onRunChanged(updated.run); }} /> : null}
    <CompletionDialog execution={current} open={completionOpen} onOpenChange={setCompletionOpen} onCompleted={(updated) => { setExecution(updated); onRunChanged(updated.run); setFeedback("Experiment completed explicitly"); }} />
  </section>;
}

function CurrentStep({ step, paused, readOnly, working, canStart, onStart, onComplete }: { step: RunStepRecord; paused: boolean; readOnly: boolean; working: boolean; canStart: boolean; onStart: () => void; onComplete: () => void }) {
  return <Card className={styles.currentStep}><CardHeader><div className={styles.currentTitle}><span>Step {step.position}</span><CardTitle>{step.title_snapshot}</CardTitle></div><Badge tone={step.status === "completed" ? "success" : step.status === "active" ? "warning" : "neutral"}>{step.status}</Badge></CardHeader><CardContent className={styles.currentContent}><p className={styles.instruction}>{step.instruction_snapshot}</p>{step.precautions_snapshot ? <p className={styles.precaution}><strong>Precaution:</strong> {step.precautions_snapshot}</p> : null}{step.substeps.length ? <ol className={styles.substeps}>{step.substeps.map((substep) => <li key={substep.id}><strong>{substep.title_snapshot}</strong><span>{substep.instruction_snapshot}</span></li>)}</ol> : null}<PersistedTimer step={step} />{paused ? <p className={styles.pausedNotice}>Resume the Experiment to change step status. Persisted time anchors remain unchanged.</p> : null}{readOnly ? <p className={styles.pausedNotice}>This completed step history is read-only. Use an amendment for a transparent correction.</p> : null}<div className={styles.stepControls}>{!readOnly && step.status === "pending" ? <Button className={styles.largeAction} disabled={working || paused || !canStart} onClick={onStart}><CirclePlay aria-hidden="true" size={21} />Start Step</Button> : null}{!readOnly && step.status === "active" ? <Button className={styles.largeAction} disabled={working || paused} onClick={onComplete}><Check aria-hidden="true" size={21} />Complete Step</Button> : null}{step.status === "completed" ? <span className={styles.completedMessage}><Check aria-hidden="true" size={20} />Completed explicitly by the researcher</span> : null}</div></CardContent></Card>;
}

function PersistedTimer({ step }: { step: RunStepRecord }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (step.status !== "active") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [step.status]);
  const elapsed = useMemo(() => {
    if (!step.actual_start_at) return 0;
    const end = step.actual_end_at ? Date.parse(step.actual_end_at) : now;
    return Math.max(0, Math.floor((end - Date.parse(step.actual_start_at)) / 1000));
  }, [now, step.actual_end_at, step.actual_start_at]);
  if (step.timer_mode_snapshot === "none" && !step.actual_start_at) return null;
  const plannedDuration = step.planned_duration_seconds_snapshot;
  const countdown = step.timer_mode_snapshot === "countdown" && plannedDuration !== null;
  const shown = countdown && plannedDuration !== null ? Math.max(0, plannedDuration - elapsed) : elapsed;
  return <div className={styles.timer}><Clock3 aria-hidden="true" size={23} /><div><span>{countdown ? "Countdown" : "Elapsed"}</span><strong>{formatDuration(shown)}</strong>{countdown && shown === 0 && step.status === "active" ? <small>Time elapsed — confirm completion manually.</small> : null}</div></div>;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, "0")).join(":");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
