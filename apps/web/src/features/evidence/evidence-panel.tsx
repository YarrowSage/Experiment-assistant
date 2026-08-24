"use client";

import { Activity, Download, FileUp, NotebookPen, Paperclip, Plus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, Tabs, Textarea } from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { activityMessage } from "./activity-presenter";
import { attachmentDownloadUrl, createNote, getEvidence, uploadAttachment } from "./api";
import styles from "./evidence.module.css";
import type { EvidenceBundle } from "./types";

export function EvidencePanel({ readOnly = false, runId, runStepId }: { readOnly?: boolean; runId: string; runStepId: string | null }) {
  const { t } = useLocalization();
  const [bundle, setBundle] = useState<EvidenceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<"run" | "step">(runStepId ? "step" : "run");
  const load = useCallback(async () => {
    setLoading(true);
    try { setBundle(await getEvidence(runId)); setError(null); }
    catch (cause) { setError(presentError(cause, t, "evidence.loadError")); }
    finally { setLoading(false); }
  }, [runId, t]);

  useEffect(() => {
    let ignore = false;
    async function loadEvidence() {
      try {
        const loaded = await getEvidence(runId);
        if (!ignore) { setBundle(loaded); setError(null); }
      } catch (cause) {
        if (!ignore) setError(presentError(cause, t, "evidence.loadError"));
      } finally { if (!ignore) setLoading(false); }
    }
    void loadEvidence();
    return () => { ignore = true; };
  }, [runId, t]);

  const selectedStepId = context === "step" ? runStepId : null;
  if (loading) return <Card><LoadingState label={t("evidence.loading")} /></Card>;
  if (error && !bundle) return <Card><ErrorState title={t("evidence.loadError")} description={error} onRetry={() => void load()} /></Card>;
  const evidence = bundle ?? { notes: [], attachments: [], activity: [] };
  return <Card className={styles.panel}>
    <div className={styles.panelHeader}><div><span>{t("evidence.eyebrow")}</span><h2>{t("evidence.title")}</h2></div>{runStepId ? <div className={styles.contextToggle} role="group" aria-label={t("accessibility.evidenceContext")}><button aria-pressed={context === "step"} type="button" onClick={() => setContext("step")}>{t("evidence.currentStep")}</button><button aria-pressed={context === "run"} type="button" onClick={() => setContext("run")}>{t("evidence.wholeExperiment")}</button></div> : null}</div>
    {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
    {readOnly ? <p className={styles.readOnlyNotice}>{t("evidence.readOnly")}</p> : null}
    <Tabs ariaLabel={t("accessibility.executionEvidence")} items={[
      { value: "notes", label: t("evidence.notes"), content: <NotesTab notes={evidence.notes.filter((note) => context === "run" ? note.run_step_record_id === null : note.run_step_record_id === runStepId)} readOnly={readOnly} runId={runId} runStepId={selectedStepId} onSaved={load} /> },
      { value: "attachments", label: t("evidence.attachments"), content: <AttachmentsTab attachments={evidence.attachments.filter((attachment) => context === "run" ? attachment.run_step_record_id === null : attachment.run_step_record_id === runStepId)} readOnly={readOnly} runId={runId} runStepId={selectedStepId} onSaved={load} /> },
      { value: "activity", label: t("evidence.activity"), content: <ActivityTab activity={evidence.activity} /> },
    ]} />
  </Card>;
}

function NotesTab({ notes, readOnly, runId, runStepId, onSaved }: { notes: EvidenceBundle["notes"]; readOnly: boolean; runId: string; runStepId: string | null; onSaved: () => Promise<void> }) {
  const { locale, t } = useLocalization();
  const [content, setContent] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); if (!content.trim()) { setError(t("evidence.noteRequired")); return; } setSaving(true); setError(null); try { await createNote(runId, content.trim(), runStepId); setContent(""); await onSaved(); } catch (cause) { setError(presentError(cause, t, "evidence.noteSaveError")); } finally { setSaving(false); } }
  return <div className={styles.tabStack}>{readOnly ? null : <form className={styles.noteForm} onSubmit={submit}><Field label={runStepId ? t("evidence.addNoteStep") : t("evidence.addNoteRun")}>{(props) => <Textarea {...props} rows={3} value={content} onChange={(event) => setContent(event.target.value)} />}</Field>{error ? <p className={styles.requestError} role="alert">{error}</p> : null}<Button disabled={saving} type="submit"><Plus aria-hidden="true" size={17} />{saving ? t("common.saving") : t("evidence.addNote")}</Button></form>}{notes.length ? <ul className={styles.noteList}>{notes.map((note) => <li key={note.id}><NotebookPen aria-hidden="true" size={18} /><div><p>{note.content}</p><time dateTime={note.created_at}>{formatDate(note.created_at, locale)}</time></div></li>)}</ul> : <EmptyState icon={<NotebookPen size={22} />} title={t("evidence.noNotes")} description={readOnly ? t("evidence.noNotesReadOnly") : t("evidence.noNotesDescription")} />}</div>;
}

function AttachmentsTab({ attachments, readOnly, runId, runStepId, onSaved }: { attachments: EvidenceBundle["attachments"]; readOnly: boolean; runId: string; runStepId: string | null; onSaved: () => Promise<void> }) {
  const { locale, t } = useLocalization();
  const [file, setFile] = useState<File | null>(null); const [description, setDescription] = useState(""); const [uploading, setUploading] = useState(false); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); if (!file) { setError(t("evidence.fileRequired")); return; } setUploading(true); setError(null); setSuccess(null); try { await uploadAttachment(runId, file, runStepId, description); setSuccess(t("evidence.uploadSuccess", { filename: file.name })); setFile(null); setDescription(""); await onSaved(); } catch (cause) { setError(presentError(cause, t, "evidence.uploadError")); } finally { setUploading(false); } }
  return <div className={styles.tabStack}>{readOnly ? null : <form className={styles.uploadForm} onSubmit={submit}><Field label={runStepId ? t("evidence.attachStep") : t("evidence.attachRun")}>{(props) => <Input {...props} type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />}</Field><Field label={t("common.description")}>{(props) => <Input {...props} value={description} onChange={(event) => setDescription(event.target.value)} />}</Field>{error ? <p className={styles.requestError} role="alert">{error}</p> : null}{success ? <p className={styles.success} role="status">{success}</p> : null}<Button disabled={uploading} type="submit"><FileUp aria-hidden="true" size={17} />{uploading ? t("evidence.uploading") : t("evidence.uploadFile")}</Button></form>}{attachments.length ? <ul className={styles.attachmentList}>{attachments.map((attachment) => <li key={attachment.id}><Paperclip aria-hidden="true" size={19} /><div><strong>{attachment.original_filename}</strong><span>{formatBytes(attachment.size_bytes, locale)} · {attachment.media_type}</span><small>{t("evidence.checksumPreview", { checksum: attachment.checksum_sha256.slice(0, 12) })}</small></div><a href={attachmentDownloadUrl(attachment)}><Download aria-hidden="true" size={17} />{t("common.download")}</a></li>)}</ul> : <EmptyState icon={<Paperclip size={22} />} title={t("evidence.noAttachments")} description={readOnly ? t("evidence.noAttachmentsReadOnly") : t("evidence.noAttachmentsDescription")} />}</div>;
}

function ActivityTab({ activity }: { activity: EvidenceBundle["activity"] }) {
  const { locale, t } = useLocalization();
  return activity.length ? <ol className={styles.activityList}>{activity.map((event) => <li key={event.id}><Activity aria-hidden="true" size={17} /><div><strong>{activityMessage(event, t)}</strong><time dateTime={event.created_at}>{formatDate(event.created_at, locale)}</time></div></li>)}</ol> : <EmptyState icon={<Activity size={22} />} title={t("evidence.noActivity")} description={t("evidence.noActivityDescription")} />;
}

function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function formatBytes(value: number, locale: string) {
  const [amount, unit] = value < 1024
    ? [value, "byte"]
    : value < 1024 * 1024
      ? [value / 1024, "kilobyte"]
      : [value / (1024 * 1024), "megabyte"];
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: "unit",
    unit,
    unitDisplay: "short",
  }).format(amount);
}
