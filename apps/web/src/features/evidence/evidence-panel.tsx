"use client";

import { Activity, Download, FileUp, NotebookPen, Paperclip, Plus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, Tabs, Textarea } from "@/components/ui";

import { attachmentDownloadUrl, createNote, getEvidence, uploadAttachment } from "./api";
import styles from "./evidence.module.css";
import type { EvidenceBundle } from "./types";

export function EvidencePanel({ readOnly = false, runId, runStepId }: { readOnly?: boolean; runId: string; runStepId: string | null }) {
  const [bundle, setBundle] = useState<EvidenceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<"run" | "step">(runStepId ? "step" : "run");
  const load = useCallback(async () => {
    setLoading(true);
    try { setBundle(await getEvidence(runId)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Evidence could not be loaded."); }
    finally { setLoading(false); }
  }, [runId]);

  useEffect(() => {
    let ignore = false;
    async function loadEvidence() {
      try {
        const loaded = await getEvidence(runId);
        if (!ignore) { setBundle(loaded); setError(null); }
      } catch (cause) {
        if (!ignore) setError(cause instanceof Error ? cause.message : "Evidence could not be loaded.");
      } finally { if (!ignore) setLoading(false); }
    }
    void loadEvidence();
    return () => { ignore = true; };
  }, [runId]);

  const selectedStepId = context === "step" ? runStepId : null;
  if (loading) return <Card><LoadingState label="Loading notes and evidence" /></Card>;
  if (error && !bundle) return <Card><ErrorState title="Evidence could not be loaded" description={error} onRetry={() => void load()} /></Card>;
  const evidence = bundle ?? { notes: [], attachments: [], activity: [] };
  return <Card className={styles.panel}>
    <div className={styles.panelHeader}><div><span>Research record</span><h2>Notes, attachments, and activity</h2></div>{runStepId ? <div className={styles.contextToggle} role="group" aria-label="Evidence context"><button aria-pressed={context === "step"} type="button" onClick={() => setContext("step")}>Current step</button><button aria-pressed={context === "run"} type="button" onClick={() => setContext("run")}>Whole Experiment</button></div> : null}</div>
    {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
    {readOnly ? <p className={styles.readOnlyNotice}>This completed scientific record is read-only. Use an amendment for a transparent correction.</p> : null}
    <Tabs ariaLabel="Execution evidence" items={[
      { value: "notes", label: "Notes", content: <NotesTab notes={evidence.notes.filter((note) => context === "run" ? note.run_step_record_id === null : note.run_step_record_id === runStepId)} readOnly={readOnly} runId={runId} runStepId={selectedStepId} onSaved={load} /> },
      { value: "attachments", label: "Attachments", content: <AttachmentsTab attachments={evidence.attachments.filter((attachment) => context === "run" ? attachment.run_step_record_id === null : attachment.run_step_record_id === runStepId)} readOnly={readOnly} runId={runId} runStepId={selectedStepId} onSaved={load} /> },
      { value: "activity", label: "Activity", content: <ActivityTab activity={evidence.activity} /> },
    ]} />
  </Card>;
}

function NotesTab({ notes, readOnly, runId, runStepId, onSaved }: { notes: EvidenceBundle["notes"]; readOnly: boolean; runId: string; runStepId: string | null; onSaved: () => Promise<void> }) {
  const [content, setContent] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); if (!content.trim()) { setError("Enter a note before saving."); return; } setSaving(true); setError(null); try { await createNote(runId, content.trim(), runStepId); setContent(""); await onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Note could not be saved."); } finally { setSaving(false); } }
  return <div className={styles.tabStack}>{readOnly ? null : <form className={styles.noteForm} onSubmit={submit}><Field label={runStepId ? "Add note to current step" : "Add note to Experiment"}>{(props) => <Textarea {...props} rows={3} value={content} onChange={(event) => setContent(event.target.value)} />}</Field>{error ? <p className={styles.requestError} role="alert">{error}</p> : null}<Button disabled={saving} type="submit"><Plus aria-hidden="true" size={17} />{saving ? "Saving…" : "Add Note"}</Button></form>}{notes.length ? <ul className={styles.noteList}>{notes.map((note) => <li key={note.id}><NotebookPen aria-hidden="true" size={18} /><div><p>{note.content}</p><time dateTime={note.created_at}>{formatDate(note.created_at)}</time></div></li>)}</ul> : <EmptyState icon={<NotebookPen size={22} />} title="No notes in this context" description={readOnly ? "No notes were recorded in this context before completion." : "Add concise observations without changing the Protocol instruction."} />}</div>;
}

function AttachmentsTab({ attachments, readOnly, runId, runStepId, onSaved }: { attachments: EvidenceBundle["attachments"]; readOnly: boolean; runId: string; runStepId: string | null; onSaved: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null); const [description, setDescription] = useState(""); const [uploading, setUploading] = useState(false); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); if (!file) { setError("Choose a file to upload."); return; } setUploading(true); setError(null); setSuccess(null); try { await uploadAttachment(runId, file, runStepId, description); setSuccess(`${file.name} uploaded and verified.`); setFile(null); setDescription(""); await onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Attachment could not be uploaded."); } finally { setUploading(false); } }
  return <div className={styles.tabStack}>{readOnly ? null : <form className={styles.uploadForm} onSubmit={submit}><Field label={runStepId ? "Attach to current step" : "Attach to Experiment"}>{(props) => <Input {...props} type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />}</Field><Field label="Description">{(props) => <Input {...props} value={description} onChange={(event) => setDescription(event.target.value)} />}</Field>{error ? <p className={styles.requestError} role="alert">{error}</p> : null}{success ? <p className={styles.success} role="status">{success}</p> : null}<Button disabled={uploading} type="submit"><FileUp aria-hidden="true" size={17} />{uploading ? "Uploading…" : "Upload File"}</Button></form>}{attachments.length ? <ul className={styles.attachmentList}>{attachments.map((attachment) => <li key={attachment.id}><Paperclip aria-hidden="true" size={19} /><div><strong>{attachment.original_filename}</strong><span>{formatBytes(attachment.size_bytes)} · {attachment.media_type}</span><small>SHA-256 {attachment.checksum_sha256.slice(0, 12)}…</small></div><a href={attachmentDownloadUrl(attachment)}><Download aria-hidden="true" size={17} />Download</a></li>)}</ul> : <EmptyState icon={<Paperclip size={22} />} title="No attachments in this context" description={readOnly ? "No attachments were recorded in this context before completion." : "Upload images, PDFs, instrument exports, spreadsheets, or other research evidence."} />}</div>;
}

function ActivityTab({ activity }: { activity: EvidenceBundle["activity"] }) {
  return activity.length ? <ol className={styles.activityList}>{activity.map((event) => <li key={event.id}><Activity aria-hidden="true" size={17} /><div><strong>{event.message}</strong><span>{event.event_type.replaceAll("_", " ").toLowerCase()}</span><time dateTime={event.created_at}>{formatDate(event.created_at)}</time></div></li>)}</ol> : <EmptyState icon={<Activity size={22} />} title="No activity yet" description="Meaningful domain events will appear here; UI interactions are not tracked." />;
}

function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function formatBytes(value: number) { if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`; return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
