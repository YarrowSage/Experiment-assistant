"use client";

import { Archive, CalendarClock, Pencil, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { ExecutionPanel } from "@/features/execution/execution-panel";
import { listProjects } from "@/features/projects/api";
import type { Project } from "@/features/projects/types";
import { listProtocols } from "@/features/protocols/api";
import { protocolVersionLabel, type Protocol } from "@/features/protocols/types";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { getExperimentRun } from "./api";
import { ArchiveExperimentRunDialog } from "./archive-experiment-run-dialog";
import { ExperimentRunFormDialog } from "./experiment-run-form-dialog";
import styles from "./experiment-runs.module.css";
import { formatDateTime, ExperimentRunStatusBadge } from "./presenters";
import type { ExperimentRun } from "./types";

export function ExperimentRunDetail({ runId }: { runId: string }) {
  const { locale, t } = useLocalization();
  const router = useRouter();
  const [run, setRun] = useState<ExperimentRun | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [loadedRun, projectResponse, protocolResponse] = await Promise.all([getExperimentRun(runId), listProjects(), listProtocols()]);
      setRun(loadedRun); setProjects(projectResponse.items); setProtocols(protocolResponse.items);
    } catch (cause) { setError(presentError(cause, t, "experiments.loadError")); }
    finally { setLoading(false); }
  }, [runId, t]);
  useEffect(() => {
    let ignore = false;
    async function loadDetail() {
      try {
        const [loadedRun, projectResponse, protocolResponse] = await Promise.all([
          getExperimentRun(runId),
          listProjects(),
          listProtocols(),
        ]);
        if (!ignore) {
          setRun(loadedRun);
          setProjects(projectResponse.items);
          setProtocols(protocolResponse.items);
          setError(null);
        }
      } catch (cause) {
        if (!ignore) {
          setError(presentError(cause, t, "experiments.loadError"));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadDetail();
    return () => {
      ignore = true;
    };
  }, [runId, t]);

  if (loading) return <Card><LoadingState label={t("experiments.loading")} /></Card>;
  if (error || !run) return <Card><ErrorState title={t("experiments.loadError")} description={error ?? t("experiments.loadError")} onRetry={() => void load()} /></Card>;
  const project = projects.find((item) => item.id === run.project_id);
  const protocolMatch = protocols.flatMap((protocol) => protocol.versions.map((version) => ({ protocol, version }))).find(({ version }) => version.id === run.protocol_version_id);
  const editable = ["draft", "planned", "ready"].includes(run.status);
  return (
    <div className={styles.pageStack}>
      <PageHeader
        action={run.status !== "archived" ? <div className={styles.headerActions}>{editable ? <Button variant="secondary" onClick={() => setEditing(true)}><Pencil aria-hidden="true" size={17} />{t("common.edit")}</Button> : null}<Button variant="secondary" onClick={() => setArchiving(true)}><Archive aria-hidden="true" size={17} />{t("common.archive")}</Button></div> : undefined}
        breadcrumb={[{ href: "/experiments/runs", label: t("experiments.allTitle") }, { label: run.title }]}
        description={run.purpose ?? t("experiments.detailDescription")}
        eyebrow={t("common.experiment")}
        title={run.title}
      />
      <div className={styles.detailGrid}>
        <Card><CardHeader><CardTitle>{t("experiments.record")}</CardTitle><ExperimentRunStatusBadge status={run.status} /></CardHeader><CardContent className={styles.detailSections}><section><h3>{t("common.project")}</h3><p>{project?.title ?? t("common.projectUnavailable")}</p></section><section><h3>{t("common.protocolVersion")}</h3><p>{protocolMatch ? <Link href={`/experiments/projects/${run.project_id}/protocols/${protocolMatch.protocol.id}`}>{protocolVersionLabel(protocolMatch.protocol, protocolMatch.version, t)}</Link> : run.protocol_version_id ? t("common.versionUnavailable") : t("experiments.noProtocol")}</p></section><section><h3>{t("common.description")}</h3><p>{run.description ?? t("common.noDescription")}</p></section><section><h3>{t("common.purpose")}</h3><p>{run.purpose ?? t("common.noPurpose")}</p></section></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("experiments.planningExecution")}</CardTitle></CardHeader><CardContent className={styles.timeGrid}><div><CalendarClock aria-hidden="true" size={18} /><div><h3>{t("experiments.planned")}</h3><p>{formatDateTime(run.planned_start_at, locale, t("common.notRecorded"))} → {formatDateTime(run.planned_end_at, locale, t("common.notRecorded"))}</p></div></div><div><Timer aria-hidden="true" size={18} /><div><h3>{t("experiments.actual")}</h3><p>{formatDateTime(run.actual_start_at, locale, t("common.notRecorded"))} → {formatDateTime(run.actual_end_at, locale, t("common.notRecorded"))}</p></div></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>{t("experiments.traceability")}</CardTitle></CardHeader><CardContent className={styles.recordMetadata}><span>{t("common.revision", { revision: run.revision })}</span><span>{t("common.created", { date: formatDateTime(run.created_at, locale, t("common.notRecorded")) })}</span><span>{t("common.updated", { date: formatDateTime(run.updated_at, locale, t("common.notRecorded")) })}</span></CardContent></Card>
      <ExecutionPanel run={run} onRunChanged={setRun} />
      {editing ? <ExperimentRunFormDialog open projects={projects} protocols={protocols} run={run} onOpenChange={setEditing} onSaved={(saved) => { setRun(saved); setEditing(false); }} /> : null}
      {archiving ? <ArchiveExperimentRunDialog open run={run} onOpenChange={setArchiving} onArchived={() => router.push("/experiments/runs")} /> : null}
    </div>
  );
}
