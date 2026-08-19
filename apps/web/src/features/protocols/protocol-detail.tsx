"use client";

import { ArrowDown, ArrowUp, LockKeyhole, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, ErrorState, Field, Input, LoadingState, PageHeader, Select, Textarea } from "@/components/ui";

import { addProtocolStep, createNewProtocolVersion, getProtocol, getProtocolVersion, moveProtocolStep, publishProtocolVersion, removeProtocolStep, updateProtocolStep } from "./api";
import styles from "./protocols.module.css";
import { latestProtocolVersion, type Protocol, type ProtocolStep, type ProtocolStepWriteInput, type ProtocolVersion, type ProtocolTimerMode } from "./types";

export function ProtocolDetail({ projectId, protocolId }: { projectId: string; protocolId: string }) {
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Protocol could not be loaded."); }
    finally { setLoading(false); }
  }, [protocolId]);
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
        if (!ignore) setError(cause instanceof Error ? cause.message : "Protocol could not be loaded.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadProtocol();
    return () => { ignore = true; };
  }, [protocolId]);

  async function selectVersion(versionId: string) {
    setLoading(true);
    try { setVersion(await getProtocolVersion(versionId)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Version could not be loaded."); }
    finally { setLoading(false); }
  }

  async function publish() {
    if (!version) return;
    try { setVersion(await publishProtocolVersion(version.id, version.revision)); await refreshProtocol(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Version could not be published."); }
  }

  async function refreshProtocol() { setProtocol(await getProtocol(protocolId)); }
  async function mutate(action: () => Promise<ProtocolVersion>) {
    try { setVersion(await action()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Protocol step could not be changed."); }
  }

  if (loading) return <Card><LoadingState label="Loading Protocol" /></Card>;
  if (error && (!protocol || !version)) return <Card><ErrorState title="Protocol could not be opened" description={error} onRetry={() => void load()} /></Card>;
  if (!protocol || !version) return <Card><ErrorState title="Protocol has no version" description="The Protocol record is incomplete." /></Card>;
  const editable = version.status === "draft";
  return <div className={styles.pageStack}>
    <PageHeader
      action={editable ? <div className={styles.headerActions}><Button variant="secondary" onClick={() => setEditingStep("new")}><Plus aria-hidden="true" size={17} />Add step</Button><Button disabled={!version.steps.length} onClick={() => void publish()}><Send aria-hidden="true" size={17} />Publish v{version.version_number}</Button></div> : <Button onClick={() => setNewVersionOpen(true)}><Plus aria-hidden="true" size={17} />New version</Button>}
      breadcrumb={[{ href: "/experiments/projects", label: "Projects" }, { href: `/experiments/projects/${projectId}`, label: "Project" }, { href: `/experiments/projects/${projectId}/protocols`, label: "Protocols" }, { label: protocol.title }]}
      description={version.purpose ?? "Versioned ordered experimental instructions"}
      eyebrow="Protocol"
      title={protocol.title}
    />
    {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
    <Card className={styles.versionBar}>
      <Field label="Version">{(props) => <Select {...props} value={version.id} onChange={(event) => void selectVersion(event.target.value)}>{[...protocol.versions].sort((a, b) => b.version_number - a.version_number).map((item) => <option key={item.id} value={item.id}>v{item.version_number} · {item.status}</option>)}</Select>}</Field>
      <div className={styles.versionState}><Badge tone={editable ? "neutral" : "success"}>{editable ? "Editable draft" : "Immutable record"}</Badge>{!editable ? <span><LockKeyhole aria-hidden="true" size={15} />Published instructions cannot be overwritten.</span> : <span>Revision {version.revision}</span>}</div>
    </Card>
    <div className={styles.stepList}>
      {version.steps.map((step, index) => <Card key={step.id}>
        <CardHeader><div className={styles.stepHeading}><span className={styles.stepNumber}>{step.position}</span><div><CardTitle>{step.title}</CardTitle><p>{step.required ? "Required" : "Optional"}{step.planned_duration_seconds !== null ? ` · ${step.planned_duration_seconds}s planned` : ""}</p></div></div>
          {editable ? <div className={styles.stepActions}><Button aria-label={`Move ${step.title} up`} disabled={index === 0} size="icon" variant="ghost" onClick={() => void mutate(() => moveProtocolStep(step.id, version.revision, "up"))}><ArrowUp aria-hidden="true" size={17} /></Button><Button aria-label={`Move ${step.title} down`} disabled={index === version.steps.length - 1} size="icon" variant="ghost" onClick={() => void mutate(() => moveProtocolStep(step.id, version.revision, "down"))}><ArrowDown aria-hidden="true" size={17} /></Button><Button aria-label={`Edit ${step.title}`} size="icon" variant="ghost" onClick={() => setEditingStep(step)}><Pencil aria-hidden="true" size={17} /></Button><Button aria-label={`Remove ${step.title}`} size="icon" variant="ghost" onClick={() => void mutate(() => removeProtocolStep(step.id, version.revision))}><Trash2 aria-hidden="true" size={17} /></Button></div> : null}
        </CardHeader>
        <CardContent className={styles.stepContent}><p>{step.instruction}</p>{step.precautions ? <p><strong>Precaution:</strong> {step.precautions}</p> : null}{step.substeps.length ? <ol>{step.substeps.map((substep) => <li key={substep.id}><strong>{substep.title}</strong> — {substep.instruction}</li>)}</ol> : null}</CardContent>
      </Card>)}
      {!version.steps.length ? <Card><div className={styles.emptySteps}><h2>No ordered steps yet</h2><p>Add the first step to this draft. A version must contain a step before it can be published.</p></div></Card> : null}
    </div>
    {editingStep ? <StepDialog version={version} step={editingStep === "new" ? null : editingStep} onOpenChange={(open) => { if (!open) setEditingStep(null); }} onSaved={(saved) => { setVersion(saved); setEditingStep(null); }} /> : null}
    {newVersionOpen ? <NewVersionDialog protocol={protocol} version={version} onOpenChange={setNewVersionOpen} onSaved={(saved) => { setVersion(saved); setNewVersionOpen(false); void refreshProtocol(); }} /> : null}
  </div>;
}

function StepDialog({ version, step, onOpenChange, onSaved }: { version: ProtocolVersion; step: ProtocolStep | null; onOpenChange: (open: boolean) => void; onSaved: (version: ProtocolVersion) => void }) {
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
    if (!title.trim() || !instruction.trim()) { setError("Step name and instruction are required."); return; }
    const parsedSubsteps = substeps.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [name, ...rest] = line.split("|"); return { title: name.trim(), instruction: rest.join("|").trim() }; });
    if (parsedSubsteps.some((item) => !item.title || !item.instruction)) { setError("Each sub-step must use: name | instruction."); return; }
    const input: ProtocolStepWriteInput = { expected_version_revision: version.revision, title: title.trim(), instruction: instruction.trim(), planned_duration_seconds: duration ? Number(duration) : null, timer_mode: timerMode, required, precautions: precautions.trim() || null, substeps: parsedSubsteps };
    setSubmitting(true); setError(null);
    try { onSaved(step ? await updateProtocolStep(step.id, input) : await addProtocolStep(version.id, input)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Step could not be saved."); }
    finally { setSubmitting(false); }
  }
  return <Dialog open title={step ? "Edit Protocol step" : "Add Protocol step"} description="Draft instructions remain editable until this version is published." onOpenChange={onOpenChange} footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={submitting} form={formId} type="submit">{submitting ? "Saving…" : "Save step"}</Button></>}>
    <form className={styles.form} id={formId} onSubmit={submit}>{error ? <p className={styles.requestError} role="alert">{error}</p> : null}<Field label="Step name" required>{(props) => <Input {...props} value={title} onChange={(event) => setTitle(event.target.value)} />}</Field><Field label="Instruction" required>{(props) => <Textarea {...props} rows={4} value={instruction} onChange={(event) => setInstruction(event.target.value)} />}</Field><div className={styles.formGrid}><Field label="Planned duration (seconds)">{(props) => <Input {...props} min="0" type="number" value={duration} onChange={(event) => setDuration(event.target.value)} />}</Field><Field label="Timer mode">{(props) => <Select {...props} value={timerMode} onChange={(event) => setTimerMode(event.target.value as ProtocolTimerMode)}><option value="none">None</option><option value="count_up">Count up</option><option value="countdown">Countdown</option></Select>}</Field></div><label className={styles.checkbox}><input checked={required} type="checkbox" onChange={(event) => setRequired(event.target.checked)} />Required step</label><Field label="Precautions">{(props) => <Textarea {...props} rows={2} value={precautions} onChange={(event) => setPrecautions(event.target.value)} />}</Field><Field label="Sub-steps" hint="One per line: name | instruction">{(props) => <Textarea {...props} rows={4} value={substeps} onChange={(event) => setSubsteps(event.target.value)} />}</Field></form>
  </Dialog>;
}

function NewVersionDialog({ protocol, version, onOpenChange, onSaved }: { protocol: Protocol; version: ProtocolVersion; onOpenChange: (open: boolean) => void; onSaved: (version: ProtocolVersion) => void }) {
  const formId = useId(); const [summary, setSummary] = useState(""); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); if (!summary.trim()) { setError("Change summary is required."); return; } try { onSaved(await createNewProtocolVersion(version.id, protocol.revision, summary.trim())); } catch (cause) { setError(cause instanceof Error ? cause.message : "New version could not be created."); } }
  return <Dialog open title="Create new Protocol version" description={`Copy v${version.version_number} into a new editable draft. The source remains unchanged.`} onOpenChange={onOpenChange} footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button form={formId} type="submit">Create draft</Button></>}><form className={styles.form} id={formId} onSubmit={submit}>{error ? <p className={styles.requestError} role="alert">{error}</p> : null}<Field label="Change summary" required>{(props) => <Textarea {...props} rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} />}</Field></form></Dialog>;
}
