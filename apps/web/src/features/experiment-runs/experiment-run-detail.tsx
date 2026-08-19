"use client";

import { Archive, CalendarClock, Pencil, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { listProjects } from "@/features/projects/api";
import type { Project } from "@/features/projects/types";

import { getExperimentRun } from "./api";
import { ArchiveExperimentRunDialog } from "./archive-experiment-run-dialog";
import { ExperimentRunFormDialog } from "./experiment-run-form-dialog";
import styles from "./experiment-runs.module.css";
import { formatDateTime, ExperimentRunStatusBadge } from "./presenters";
import type { ExperimentRun } from "./types";

export function ExperimentRunDetail({ runId }: { runId: string }) {
  const router = useRouter();
  const [run, setRun] = useState<ExperimentRun | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [loadedRun, projectResponse] = await Promise.all([getExperimentRun(runId), listProjects()]);
      setRun(loadedRun); setProjects(projectResponse.items);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The Experiment could not be loaded."); }
    finally { setLoading(false); }
  }, [runId]);
  useEffect(() => {
    let ignore = false;
    async function loadDetail() {
      try {
        const [loadedRun, projectResponse] = await Promise.all([
          getExperimentRun(runId),
          listProjects(),
        ]);
        if (!ignore) {
          setRun(loadedRun);
          setProjects(projectResponse.items);
          setError(null);
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "The Experiment could not be loaded.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadDetail();
    return () => {
      ignore = true;
    };
  }, [runId]);

  if (loading) return <Card><LoadingState label="Loading Experiment" /></Card>;
  if (error || !run) return <Card><ErrorState title="Experiment could not be opened" description={error ?? "The Experiment was not found."} onRetry={() => void load()} /></Card>;
  const project = projects.find((item) => item.id === run.project_id);
  return (
    <div className={styles.pageStack}>
      <PageHeader
        action={run.status !== "archived" ? <div className={styles.headerActions}><Button variant="secondary" onClick={() => setEditing(true)}><Pencil aria-hidden="true" size={17} />Edit</Button><Button variant="secondary" onClick={() => setArchiving(true)}><Archive aria-hidden="true" size={17} />Archive</Button></div> : undefined}
        breadcrumb={[{ href: "/experiments/runs", label: "All Experiments" }, { label: run.title }]}
        description={run.purpose ?? "Generic ExperimentRun record"}
        eyebrow="Experiment"
        title={run.title}
      />
      <div className={styles.detailGrid}>
        <Card><CardHeader><CardTitle>Experiment record</CardTitle><ExperimentRunStatusBadge status={run.status} /></CardHeader><CardContent className={styles.detailSections}><section><h3>Project</h3><p>{project?.title ?? "Project unavailable"}</p></section><section><h3>Description</h3><p>{run.description ?? "No description recorded."}</p></section><section><h3>Purpose</h3><p>{run.purpose ?? "No purpose recorded."}</p></section></CardContent></Card>
        <Card><CardHeader><CardTitle>Planning and execution time</CardTitle></CardHeader><CardContent className={styles.timeGrid}><div><CalendarClock aria-hidden="true" size={18} /><div><h3>Planned</h3><p>{formatDateTime(run.planned_start_at)} → {formatDateTime(run.planned_end_at)}</p></div></div><div><Timer aria-hidden="true" size={18} /><div><h3>Actual</h3><p>{formatDateTime(run.actual_start_at)} → {formatDateTime(run.actual_end_at)}</p></div></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Traceability</CardTitle></CardHeader><CardContent className={styles.recordMetadata}><span>Revision {run.revision}</span><span>Created {formatDateTime(run.created_at)}</span><span>Updated {formatDateTime(run.updated_at)}</span></CardContent></Card>
      <Card><div className={styles.plannedNotice}><Timer aria-hidden="true" size={22} /><div><h2>Execution is planned for P1-06</h2><p>This record keeps planned and actual timestamps separate. Step execution is not simulated here.</p></div></div></Card>
      {editing ? <ExperimentRunFormDialog open projects={projects} run={run} onOpenChange={setEditing} onSaved={(saved) => { setRun(saved); setEditing(false); }} /> : null}
      {archiving ? <ArchiveExperimentRunDialog open run={run} onOpenChange={setArchiving} onArchived={() => router.push("/experiments/runs")} /> : null}
    </div>
  );
}
