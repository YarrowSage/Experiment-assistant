"use client";

import { ArrowDown, ArrowUp, LockKeyhole, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, ErrorState, Field, Input, LoadingState, PageHeader, Select, Textarea } from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { addProtocolStep, createNewProtocolVersion, getProtocol, getProtocolVersion, moveProtocolStep, publishProtocolVersion, removeProtocolStep, updateProtocolStep } from "./api";
import styles from "./protocols.module.css";
import { latestProtocolVersion, type Protocol, type ProtocolStep, type ProtocolStepWriteInput, type ProtocolVersion, type ProtocolTimerMode } from "./types";

export function ProtocolDetail({ projectId, protocolId }: { projectId: string; protocolId: string }) {
  const { t } = useLocalization();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [version, setVersion] = useState<ProtocolVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<ProtocolStep | "new" | null>(null);
  const [newVersionOpen, setNewVersionOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loadedProtocol = await getProtocol(protocolId);
      const selected = latestProtocolVersion(loadedProtocol);
      setProtocol(loadedProtocol);
      setVersion(selected ? await getProtocolVersion(selected.id) : null);
      setError(null);
    } catch (cause) { setError(presentError(cause, t, "protocols.loadError")); }
    finally { setLoading(false); }
  }, [protocolId, t]);
  useEffect(() => {
    let ignore = false;
    async function loadProtocol() {
      try {
        const loadedProtocol = await getProtocol(protocolId);
        const selected = latestProtocolVersion(loadedProtocol);
        const loadedVersion = selected ? await getProtocolVersion(selected.id) : null;
        if (!ignore) {
          setProtocol(loadedProtocol);
          setVersion(loadedVersion);
          setError(null);
        }
      } catch (cause) {
        if (!ignore) setError(presentError(cause, t, "protocols.loadError"));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadProtocol();
    return () => { ignore = true; };
  }, [protocolId, t]);

  async function selectVersion(versionId: string) {
    setLoading(true);
    try { setVersion(await getProtocolVersion(versionId)); setError(null); }
    catch (cause) { setError(presentError(cause, t, "protocols.loadVersionError")); }
    finally { setLoading(false); }
  }

  async function publish() {
    if (!version) return;
    try { setVersion(await publishProtocolVersion(version.id, version.revision)); await refreshProtocol(); }
    catch (cause) { setError(presentError(cause, t, "protocols.publishError")); }
  }

  async function refreshProtocol() { setProtocol(await getProtocol(protocolId)); }
  async function mutate(action: () => Promise<ProtocolVersion>) {
    try { setVersion(await action()); setError(null); }
    catch (cause) { setError(presentError(cause, t, "protocols.changeStepError")); }
  }

  if (loading) return <Card><LoadingState label={t("protocols.loading")} /></Card>;
  if (error && (!protocol || !version)) return <Card><ErrorState title={t("protocols.loadError")} description={error} onRetry={() => void load()} /></Card>;
  if (!protocol || !version) return <Card><ErrorState title={t("protocols.noVersion")} description={t("protocols.loadError")} /></Card>;
  const editable = version.status === "draft";
  return <div className={styles.pageStack}>
    <PageHeader
      action={editable ? <div className={styles.headerActions}><Button variant="secondary" onClick={() => setEditingStep("new")}><Plus aria-hidden="true" size={17} />{t("protocols.addStep")}</Button><Button disabled={!version.steps.length} onClick={() => void publish()}><Send aria-hidden="true" size={17} />{t("protocols.publish", { version: version.version_number })}</Button></div> : <Button onClick={() => setNewVersionOpen(true)}><Plus aria-hidden="true" size={17} />{t("protocols.newVersion")}</Button>}
      breadcrumb={[{ href: "/experiments/projects", label: t("projects.title") }, { href: `/experiments/projects/${projectId}`, label: t("common.project") }, { href: `/experiments/projects/${projectId}/protocols`, label: t("protocols.title") }, { label: protocol.title }]}
      description={version.purpose ?? t("protocols.versionedInstructions")}
      eyebrow={t("common.protocol")}
      title={protocol.title}
    />
    {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
    <Card className={styles.versionBar}>
      <Field label={t("protocols.version")}>{(props) => <Select {...props} value={version.id} onChange={(event) => void selectVersion(event.target.value)}>{[...protocol.versions].sort((a, b) => b.version_number - a.version_number).map((item) => <option key={item.id} value={item.id}>v{item.version_number} · {t(item.status === "published" ? "status.published" : "status.draft")}</option>)}</Select>}</Field>
      <div className={styles.versionState}><Badge tone={editable ? "neutral" : "success"}>{editable ? t("protocols.editableDraft") : t("protocols.immutableRecord")}</Badge>{!editable ? <span><LockKeyhole aria-hidden="true" size={15} />{t("protocols.publishedLocked")}</span> : <span>{t("common.revision", { revision: version.revision })}</span>}</div>
    </Card>
    <div className={styles.stepList}>
      {version.steps.map((step, index) => <Card key={step.id}>
        <CardHeader><div className={styles.stepHeading}><span className={styles.stepNumber}>{step.position}</span><div><CardTitle>{step.title}</CardTitle><p>{step.required ? t("protocols.stepRequired") : t("protocols.stepOptional")}{step.planned_duration_seconds !== null ? ` · ${t("protocols.durationPlanned", { seconds: step.planned_duration_seconds })}` : ""}</p></div></div>
          {editable ? <div className={styles.stepActions}><Button aria-label={t("protocols.moveUp", { title: step.title })} disabled={index === 0} size="icon" variant="ghost" onClick={() => void mutate(() => moveProtocolStep(step.id, version.revision, "up"))}><ArrowUp aria-hidden="true" size={17} /></Button><Button aria-label={t("protocols.moveDown", { title: step.title })} disabled={index === version.steps.length - 1} size="icon" variant="ghost" onClick={() => void mutate(() => moveProtocolStep(step.id, version.revision, "down"))}><ArrowDown aria-hidden="true" size={17} /></Button><Button aria-label={t("protocols.editStepLabel", { title: step.title })} size="icon" variant="ghost" onClick={() => setEditingStep(step)}><Pencil aria-hidden="true" size={17} /></Button><Button aria-label={t("protocols.removeStepLabel", { title: step.title })} size="icon" variant="ghost" onClick={() => void mutate(() => removeProtocolStep(step.id, version.revision))}><Trash2 aria-hidden="true" size={17} /></Button></div> : null}
        </CardHeader>
        <CardContent className={styles.stepContent}><p>{step.instruction}</p>{step.precautions ? <p><strong>{t("protocols.precaution")}</strong> {step.precautions}</p> : null}{step.substeps.length ? <ol>{step.substeps.map((substep) => <li key={substep.id}><strong>{substep.title}</strong> — {substep.instruction}</li>)}</ol> : null}</CardContent>
      </Card>)}
      {!version.steps.length ? <Card><div className={styles.emptySteps}><h2>{t("protocols.noSteps")}</h2><p>{t("protocols.noStepsDescription")}</p></div></Card> : null}
    </div>
    {editingStep ? <StepDialog version={version} step={editingStep === "new" ? null : editingStep} onOpenChange={(open) => { if (!open) setEditingStep(null); }} onSaved={(saved) => { setVersion(saved); setEditingStep(null); }} /> : null}
    {newVersionOpen ? <NewVersionDialog protocol={protocol} version={version} onOpenChange={setNewVersionOpen} onSaved={(saved) => { setVersion(saved); setNewVersionOpen(false); void refreshProtocol(); }} /> : null}
  </div>;
}

function StepDialog({ version, step, onOpenChange, onSaved }: { version: ProtocolVersion; step: ProtocolStep | null; onOpenChange: (open: boolean) => void; onSaved: (version: ProtocolVersion) => void }) {
  const { t } = useLocalization();
  const formId = useId();
  const [title, setTitle] = useState(step?.title ?? "");
  const [instruction, setInstruction] = useState(step?.instruction ?? "");
  const [duration, setDuration] = useState(step?.planned_duration_seconds?.toString() ?? "");
  const [timerMode, setTimerMode] = useState<ProtocolTimerMode>(step?.timer_mode ?? "none");
  const [required, setRequired] = useState(step?.required ?? true);
  const [precautions, setPrecautions] = useState(step?.precautions ?? "");
  const [substeps, setSubsteps] = useState(step?.substeps.map((item) => `${item.title} | ${item.instruction}`).join("\n") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !instruction.trim()) { setError(t("protocols.form.requiredError")); return; }
    const parsedSubsteps = substeps.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [name, ...rest] = line.split("|"); return { title: name.trim(), instruction: rest.join("|").trim() }; });
    if (parsedSubsteps.some((item) => !item.title || !item.instruction)) { setError(t("protocols.form.substepError")); return; }
    const input: ProtocolStepWriteInput = { expected_version_revision: version.revision, title: title.trim(), instruction: instruction.trim(), planned_duration_seconds: duration ? Number(duration) : null, timer_mode: timerMode, required, precautions: precautions.trim() || null, substeps: parsedSubsteps };
    setSubmitting(true); setError(null);
    try { onSaved(step ? await updateProtocolStep(step.id, input) : await addProtocolStep(version.id, input)); }
    catch (cause) { setError(presentError(cause, t, "protocols.form.saveError")); }
    finally { setSubmitting(false); }
  }
  return <Dialog open title={step ? t("protocols.form.editStep") : t("protocols.form.addStep")} description={t("protocols.form.stepDescription")} onOpenChange={onOpenChange} footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button disabled={submitting} form={formId} type="submit">{submitting ? t("common.saving") : t("protocols.form.saveStep")}</Button></>}>
    <form className={styles.form} id={formId} onSubmit={submit}>{error ? <p className={styles.requestError} role="alert">{error}</p> : null}<Field label={t("protocols.form.stepName")} required>{(props) => <Input {...props} value={title} onChange={(event) => setTitle(event.target.value)} />}</Field><Field label={t("protocols.form.instruction")} required>{(props) => <Textarea {...props} rows={4} value={instruction} onChange={(event) => setInstruction(event.target.value)} />}</Field><div className={styles.formGrid}><Field label={t("protocols.form.duration")}>{(props) => <Input {...props} min="0" type="number" value={duration} onChange={(event) => setDuration(event.target.value)} />}</Field><Field label={t("protocols.form.timerMode")}>{(props) => <Select {...props} value={timerMode} onChange={(event) => setTimerMode(event.target.value as ProtocolTimerMode)}><option value="none">{t("common.none")}</option><option value="count_up">{t("protocols.form.countUp")}</option><option value="countdown">{t("protocols.form.countdown")}</option></Select>}</Field></div><label className={styles.checkbox}><input checked={required} type="checkbox" onChange={(event) => setRequired(event.target.checked)} />{t("protocols.form.requiredStep")}</label><Field label={t("protocols.form.precautions")}>{(props) => <Textarea {...props} rows={2} value={precautions} onChange={(event) => setPrecautions(event.target.value)} />}</Field><Field label={t("protocols.form.substeps")} hint={t("protocols.form.substepsHint")}>{(props) => <Textarea {...props} rows={4} value={substeps} onChange={(event) => setSubsteps(event.target.value)} />}</Field></form>
  </Dialog>;
}

function NewVersionDialog({ protocol, version, onOpenChange, onSaved }: { protocol: Protocol; version: ProtocolVersion; onOpenChange: (open: boolean) => void; onSaved: (version: ProtocolVersion) => void }) {
  const { t } = useLocalization();
  const formId = useId(); const [summary, setSummary] = useState(""); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); if (!summary.trim()) { setError(t("protocols.form.changeSummaryRequired")); return; } try { onSaved(await createNewProtocolVersion(version.id, protocol.revision, summary.trim())); } catch (cause) { setError(presentError(cause, t, "protocols.form.newVersionError")); } }
  return <Dialog open title={t("protocols.form.newVersionTitle")} description={t("protocols.form.newVersionDescription", { version: version.version_number })} onOpenChange={onOpenChange} footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button form={formId} type="submit">{t("protocols.form.createDraft")}</Button></>}><form className={styles.form} id={formId} onSubmit={submit}>{error ? <p className={styles.requestError} role="alert">{error}</p> : null}<Field label={t("protocols.form.changeSummary")} required>{(props) => <Textarea {...props} rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} />}</Field></form></Dialog>;
}
