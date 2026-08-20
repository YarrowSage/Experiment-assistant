"use client";

import { BookOpenText, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";

import { Badge, Button, Card, Dialog, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Textarea } from "@/components/ui";

import { createProtocol, listProtocols } from "./api";
import styles from "./protocols.module.css";
import { latestProtocolVersion, type Protocol } from "./types";

export function ProtocolsPage({ projectId }: { projectId: string }) {
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
      setError(cause instanceof Error ? cause.message : "Protocols could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

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
        if (!ignore) setError(cause instanceof Error ? cause.message : "Protocols could not be loaded.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadProtocols();
    return () => { ignore = true; };
  }, [projectId]);

  return (
    <div className={styles.pageStack}>
      <PageHeader
        action={<Button onClick={() => setCreating(true)}><Plus aria-hidden="true" size={17} />New Protocol</Button>}
        breadcrumb={[{ href: "/experiments/projects", label: "Projects" }, { href: `/experiments/projects/${projectId}`, label: "Project" }, { label: "Protocols" }]}
        description="Build ordered instructions as drafts, then publish an immutable version for traceable experiments."
        eyebrow="Project"
        title="Protocols"
      />
      {loading ? <Card><LoadingState label="Loading Protocols" /></Card>
        : error ? <Card><ErrorState title="Protocols could not be loaded" description={error} onRetry={() => void load()} /></Card>
        : protocols.length ? <div className={styles.protocolList}>{protocols.map((protocol) => {
            const latest = latestProtocolVersion(protocol);
            return <Card className={styles.protocolCard} key={protocol.id}>
              <div><Link href={`/experiments/projects/${projectId}/protocols/${protocol.id}`}><h2>{protocol.title}</h2></Link><p>{protocol.versions.length} saved version{protocol.versions.length === 1 ? "" : "s"}</p></div>
              <div className={styles.protocolMeta}><Badge tone={latest?.status === "published" ? "success" : "neutral"}>{latest ? `v${latest.version_number} · ${latest.status}` : "No version"}</Badge><Link href={`/experiments/projects/${projectId}/protocols/${protocol.id}`}>Open Protocol</Link></div>
            </Card>;
          })}</div>
        : <Card><EmptyState icon={<BookOpenText size={23} />} title="No Protocols yet" description="Create a Protocol to draft reusable ordered steps. Publishing freezes the exact instructions used by Experiments." action={<Button variant="secondary" onClick={() => setCreating(true)}>New Protocol</Button>} /></Card>}
      {creating ? <NewProtocolDialog projectId={projectId} onOpenChange={setCreating} onSaved={() => void load()} /> : null}
    </div>
  );
}

export function NewProtocolDialog({ projectId, onOpenChange, onSaved }: { projectId: string; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const formId = useId();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError("Protocol name is required."); return; }
    setSubmitting(true); setError(null);
    try {
      await createProtocol({ project_id: projectId, title: title.trim(), description: description.trim() || null, purpose: purpose.trim() || null, precautions: null });
      onSaved(); onOpenChange(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Protocol could not be created."); }
    finally { setSubmitting(false); }
  }
  return <Dialog open title="New Protocol" description="A new Protocol starts with an editable Draft v1." onOpenChange={onOpenChange} footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={submitting} form={formId} type="submit">{submitting ? "Creating…" : "Create Protocol"}</Button></>}>
    <form className={styles.form} id={formId} onSubmit={submit}>
      {error ? <p className={styles.requestError} role="alert">{error}</p> : null}
      <Field label="Protocol name" required>{(props) => <Input {...props} value={title} onChange={(event) => setTitle(event.target.value)} />}</Field>
      <Field label="Purpose">{(props) => <Textarea {...props} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} />}</Field>
      <Field label="Description">{(props) => <Textarea {...props} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />}</Field>
    </form>
  </Dialog>;
}
