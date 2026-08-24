"use client";

import { BookOpenText, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";

import { Badge, Button, Card, Dialog, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Textarea } from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { createProtocol, listProtocols } from "./api";
import styles from "./protocols.module.css";
import { latestProtocolVersion, type Protocol } from "./types";

export function ProtocolsPage({ projectId }: { projectId: string }) {
  const { t } = useLocalization();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listProtocols(projectId);
      setProtocols(response.items);
      setError(null);
    } catch (cause) {
      setError(presentError(cause, t, "protocols.loadError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    let ignore = false;
    async function loadProtocols() {
      try {
        const response = await listProtocols(projectId);
        if (!ignore) {
          setProtocols(response.items);
          setError(null);
        }
      } catch (cause) {
        if (!ignore) setError(presentError(cause, t, "protocols.loadError"));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadProtocols();
    return () => { ignore = true; };
  }, [projectId, t]);

  return (
    <div className={styles.pageStack}>
      <PageHeader
        action={<Button onClick={() => setCreating(true)}><Plus aria-hidden="true" size={17} />{t("protocols.new")}</Button>}
        breadcrumb={[{ href: "/experiments/projects", label: t("projects.title") }, { href: `/experiments/projects/${projectId}`, label: t("common.project") }, { label: t("protocols.title") }]}
        description={t("protocols.description")}
        eyebrow={t("common.project")}
        title={t("protocols.title")}
      />
      {loading ? <Card><LoadingState label={t("protocols.loading")} /></Card>
        : error ? <Card><ErrorState title={t("protocols.loadError")} description={error} onRetry={() => void load()} /></Card>
        : protocols.length ? <div className={styles.protocolList}>{protocols.map((protocol) => {
            const latest = latestProtocolVersion(protocol);
            return <Card className={styles.protocolCard} key={protocol.id}>
              <div><Link href={`/experiments/projects/${projectId}/protocols/${protocol.id}`}><h2>{protocol.title}</h2></Link><p>{t("protocols.savedVersions", { count: protocol.versions.length })}</p></div>
              <div className={styles.protocolMeta}><Badge tone={latest?.status === "published" ? "success" : "neutral"}>{latest ? `v${latest.version_number} · ${t(latest.status === "published" ? "status.published" : "status.draft")}` : t("protocols.noVersion")}</Badge><Link href={`/experiments/projects/${projectId}/protocols/${protocol.id}`}>{t("protocols.open")}</Link></div>
            </Card>;
          })}</div>
        : <Card><EmptyState icon={<BookOpenText size={23} />} title={t("protocols.none")} description={t("protocols.empty")} action={<Button variant="secondary" onClick={() => setCreating(true)}>{t("protocols.new")}</Button>} /></Card>}
      {creating ? <NewProtocolDialog projectId={projectId} onOpenChange={setCreating} onSaved={() => void load()} /> : null}
    </div>
  );
}

export function NewProtocolDialog({ projectId, onOpenChange, onSaved }: { projectId: string; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const { t } = useLocalization();
  const formId = useId();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError(t("protocols.form.nameRequired")); return; }
    setSubmitting(true); setError(null);
    try {
      await createProtocol({ project_id: projectId, title: title.trim(), description: description.trim() || null, purpose: purpose.trim() || null, precautions: null });
      onSaved(); onOpenChange(false);
    } catch (cause) { setError(presentError(cause, t, "protocols.form.createError")); }
    finally { setSubmitting(false); }
  }
  return <Dialog open title={t("protocols.new")} description={t("protocols.form.newDescription")} onOpenChange={onOpenChange} footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button disabled={submitting} form={formId} type="submit">{submitting ? t("common.creating") : t("protocols.form.create")}</Button></>}>
    <form className={styles.form} id={formId} onSubmit={submit}>
      {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
      <Field label={t("protocols.form.name")} required>{(props) => <Input {...props} value={title} onChange={(event) => setTitle(event.target.value)} />}</Field>
      <Field label={t("common.purpose")}>{(props) => <Textarea {...props} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} />}</Field>
      <Field label={t("common.description")}>{(props) => <Textarea {...props} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />}</Field>
    </form>
  </Dialog>;
}
