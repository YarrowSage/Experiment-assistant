"use client";

import { ArrowLeft, ArrowRight, Check, CirclePause, CirclePlay, Clock3, Flag, ListChecks, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ErrorState, LoadingState } from "@/components/ui";
import { AmendmentPanel } from "@/features/amendments/amendment-panel";
import { CompletionDialog } from "@/features/amendments/completion-dialog";
import { EvidencePanel } from "@/features/evidence/evidence-panel";
import type { ExperimentRun } from "@/features/experiment-runs/types";
import { presentError, type MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

import { completeRunStep, getRunExecution, pauseRunExecution, resumeRunExecution, startRunExecution, startRunStep } from "./api";
import styles from "./execution.module.css";
import type { RunExecution, RunStepRecord } from "./types";

export function ExecutionPanel({ run, onRunChanged }: { run: ExperimentRun; onRunChanged: (run: ExperimentRun) => void }) {
  const { locale, t } = useLocalization();
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
    catch (cause) { setError(presentError(cause, t, "execution.loadError")); }
    finally { setLoading(false); }
  }, [run.id, t]);

  useEffect(() => {
    let ignore = false;
    async function loadExecution() {
      try {
        const loaded = await getRunExecution(run.id);
        if (!ignore) { setExecution(loaded); setError(null); }
      } catch (cause) {
        if (!ignore) setError(presentError(cause, t, "execution.loadError"));
      } finally { if (!ignore) setLoading(false); }
    }
    void loadExecution();
    return () => { ignore = true; };
  }, [run.id, run.revision, t]);

  async function mutate(action: () => Promise<RunExecution>, success: string) {
    setWorking(true); setError(null); setFeedback(null);
    try {
      const updated = await action();
      setExecution(updated); onRunChanged(updated.run); setFeedback(success);
    } catch (cause) { setError(presentError(cause, t, "execution.updateError")); }
    finally { setWorking(false); }
  }

  if (loading) return <Card><LoadingState label={t("execution.loading")} /></Card>;
  if (error && !execution) return <Card><ErrorState title={t("execution.loadError")} description={error} onRetry={() => void load()} /></Card>;
  const current = execution ?? { run, steps: [] };
  const completed = current.run.completed_at !== null;

  if (["draft", "cancelled"].includes(current.run.status) || (current.run.status === "archived" && !completed)) {
    return <Card><div className={styles.notReady}><ListChecks aria-hidden="true" size={22} /><div><h2>{t("execution.unavailable")}</h2><p>{current.run.status === "draft" ? t("execution.setPlanned") : t("execution.invalidState")}</p></div></div></Card>;
  }
  if (["planned", "ready"].includes(current.run.status)) {
    if (current.run.protocol_version_id === null) {
      return <Card><div className={styles.notReady}><ListChecks aria-hidden="true" size={22} /><div><h2>{t("execution.protocolRequired")}</h2><p>{t("execution.protocolRequiredDescription")}</p></div></div></Card>;
    }
    return <Card className={styles.startCard}><div><span className={styles.eyebrow}>{t("execution.eyebrow")}</span><h2>{t("execution.ready")}</h2><p>{t("execution.readyDescription")}</p></div><Button className={styles.largeAction} disabled={working} onClick={() => void mutate(() => startRunExecution(run.id, current.run.revision), t("execution.started")) }><CirclePlay aria-hidden="true" size={21} />{working ? t("execution.starting") : t("execution.start")}</Button></Card>;
  }

  const active = current.steps.find((step) => step.status === "active");
  const nextPending = current.steps.find((step) => step.status === "pending");
  const defaultStep = active ?? nextPending ?? current.steps.at(-1);
  const selected = current.steps.find((step) => step.id === selectedId) ?? defaultStep;
  const selectedIndex = selected ? current.steps.findIndex((step) => step.id === selected.id) : -1;
  const completedCount = current.steps.filter((step) => step.status === "completed").length;
  const progress = current.steps.length ? Math.round((completedCount / current.steps.length) * 100) : 0;
  const paused = current.run.status === "paused";
  const completionBadge = current.run.status === "archived" ? t("execution.archivedCompleted") : t("status.completed");

  return <section aria-labelledby="execution-heading" className={styles.execution}>
    <Card className={styles.executionHeader}><div><span className={styles.eyebrow}>{completed ? t("execution.completedRecord") : t("execution.live")}</span><h2 id="execution-heading">{completed ? t("execution.completedTitle") : paused ? t("execution.pausedTitle") : t("execution.progressTitle")}</h2><p>{t("execution.stepsCompleted", { completed: completedCount, total: current.steps.length })}{completed && current.run.completed_at ? ` · ${t("execution.completedAt", { date: formatDate(current.run.completed_at, locale) })}` : ""}</p></div><div className={styles.runControls}><Badge tone={completed ? "neutral" : paused ? "warning" : "success"}>{completed ? completionBadge : paused ? t("status.paused") : t("status.running")}</Badge>{completed ? null : paused ? <Button disabled={working} onClick={() => void mutate(() => resumeRunExecution(run.id, current.run.revision), t("execution.resumed"))}><RotateCcw aria-hidden="true" size={18} />{t("execution.resume")}</Button> : <Button disabled={working} variant="secondary" onClick={() => void mutate(() => pauseRunExecution(run.id, current.run.revision), t("execution.pausedFeedback"))}><CirclePause aria-hidden="true" size={18} />{t("execution.pause")}</Button>}{completed ? null : <Button disabled={working} onClick={() => setCompletionOpen(true)}><Flag aria-hidden="true" size={18} />{t("execution.complete")}</Button>}</div><div aria-label={t("accessibility.progress", { progress })} className={styles.progressTrack} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div></Card>
    {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
    {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    {completed && current.run.completion_note ? <Card className={styles.completionNote}><strong>{t("execution.completionNote")}</strong><p>{current.run.completion_note}</p></Card> : null}
    {selected ? <CurrentStep step={selected} paused={paused} readOnly={completed} working={working} canStart={selected.id === nextPending?.id && !active} onStart={() => void mutate(() => startRunStep(selected.id, current.run.revision, selected.revision), t("execution.stepStarted"))} onComplete={() => void mutate(() => completeRunStep(selected.id, current.run.revision, selected.revision), t("execution.stepCompleted"))} /> : <Card><div className={styles.notReady}><ListChecks aria-hidden="true" size={22} /><div><h2>{t("execution.noSteps")}</h2><p>{completed ? t("execution.noCompletedSteps") : t("execution.noMaterializedSteps")}</p></div></div></Card>}
    {selected ? <div className={styles.stepNavigation}><Button disabled={selectedIndex <= 0} variant="secondary" onClick={() => setSelectedId(current.steps[selectedIndex - 1]?.id ?? null)}><ArrowLeft aria-hidden="true" size={18} />{t("common.previous")}</Button><span>{t("execution.stepOf", { current: selectedIndex + 1, total: current.steps.length })}</span><Button disabled={selectedIndex >= current.steps.length - 1} variant="secondary" onClick={() => setSelectedId(current.steps[selectedIndex + 1]?.id ?? null)}>{t("common.next")}<ArrowRight aria-hidden="true" size={18} /></Button></div> : null}
    {current.steps.length ? <Card><CardHeader><CardTitle>{t("execution.allSteps")}</CardTitle></CardHeader><CardContent><ol className={styles.allSteps}>{current.steps.map((step) => <li key={step.id}><button aria-current={selected?.id === step.id ? "step" : undefined} type="button" onClick={() => setSelectedId(step.id)}><span>{step.position}</span><span><strong>{step.title_snapshot}</strong><small>{t(stepStatusKey(step.status))}</small></span>{step.status === "completed" ? <Check aria-hidden="true" size={18} /> : null}</button></li>)}</ol></CardContent></Card> : null}
    <EvidencePanel readOnly={completed} runId={run.id} runStepId={selected?.id ?? null} />
    {completed ? <AmendmentPanel execution={current} onExecutionChanged={(updated) => { setExecution(updated); onRunChanged(updated.run); }} /> : null}
    {completed ? null : <CompletionDialog execution={current} open={completionOpen} onOpenChange={setCompletionOpen} onCompleted={(updated) => { setExecution(updated); onRunChanged(updated.run); setFeedback(t("execution.completedFeedback")); }} />}
  </section>;
}

function CurrentStep({ step, paused, readOnly, working, canStart, onStart, onComplete }: { step: RunStepRecord; paused: boolean; readOnly: boolean; working: boolean; canStart: boolean; onStart: () => void; onComplete: () => void }) {
  const { t } = useLocalization();
  return <Card className={styles.currentStep}><CardHeader><div className={styles.currentTitle}><span>{t("execution.stepPosition", { position: step.position })}</span><CardTitle>{step.title_snapshot}</CardTitle></div><Badge tone={step.status === "completed" ? "success" : step.status === "active" ? "warning" : "neutral"}>{t(stepStatusKey(step.status))}</Badge></CardHeader><CardContent className={styles.currentContent}><p className={styles.instruction}>{step.instruction_snapshot}</p>{step.precautions_snapshot ? <p className={styles.precaution}><strong>{t("execution.precaution")}</strong> {step.precautions_snapshot}</p> : null}{step.substeps.length ? <ol className={styles.substeps}>{step.substeps.map((substep) => <li key={substep.id}><strong>{substep.title_snapshot}</strong><span>{substep.instruction_snapshot}</span></li>)}</ol> : null}<PersistedTimer step={step} />{paused ? <p className={styles.pausedNotice}>{t("execution.pausedNotice")}</p> : null}{readOnly ? <p className={styles.pausedNotice}>{t("execution.readOnlyNotice")}</p> : null}<div className={styles.stepControls}>{!readOnly && step.status === "pending" ? <Button className={styles.largeAction} disabled={working || paused || !canStart} onClick={onStart}><CirclePlay aria-hidden="true" size={21} />{t("execution.startStep")}</Button> : null}{!readOnly && step.status === "active" ? <Button className={styles.largeAction} disabled={working || paused} onClick={onComplete}><Check aria-hidden="true" size={21} />{t("execution.completeStep")}</Button> : null}{step.status === "completed" ? <span className={styles.completedMessage}><Check aria-hidden="true" size={20} />{t("execution.completedExplicitly")}</span> : null}</div></CardContent></Card>;
}

function PersistedTimer({ step }: { step: RunStepRecord }) {
  const { t } = useLocalization();
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
  return <div className={styles.timer}><Clock3 aria-hidden="true" size={23} /><div><span>{countdown ? t("execution.countdown") : t("execution.elapsed")}</span><strong>{formatDuration(shown)}</strong>{countdown && shown === 0 && step.status === "active" ? <small>{t("execution.timerElapsed")}</small> : null}</div></div>;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, "0")).join(":");
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function stepStatusKey(status: RunStepRecord["status"]): MessageKey {
  if (status === "active") return "status.active";
  if (status === "completed") return "status.completed";
  return "status.pending";
}
