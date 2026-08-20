"use client";

import { Activity, ArrowRight, Beaker, BookOpenText, CalendarDays, CirclePlay, FolderKanban, Pause } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { listRecentActivity } from "@/features/evidence/api";
import type { ActivityEvent } from "@/features/evidence/types";
import { listExperimentRuns } from "@/features/experiment-runs/api";
import { ExperimentRunFormDialog } from "@/features/experiment-runs/experiment-run-form-dialog";
import { formatDateTime, ExperimentRunStatusBadge } from "@/features/experiment-runs/presenters";
import type { ExperimentRun } from "@/features/experiment-runs/types";
import { listProjects } from "@/features/projects/api";
import { ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { ProjectStatusBadge } from "@/features/projects/project-presenters";
import type { Project } from "@/features/projects/types";
import { listProtocols } from "@/features/protocols/api";
import { NewProtocolDialog } from "@/features/protocols/protocols-page";
import type { Protocol } from "@/features/protocols/types";

import styles from "./home-dashboard.module.css";

type HomeData = {
  running: ExperimentRun[];
  paused: ExperimentRun[];
  today: ExperimentRun[];
  projects: Project[];
  protocols: Protocol[];
  recent: ActivityEvent[];
};

const emptyData: HomeData = { running: [], paused: [], today: [], projects: [], protocols: [], recent: [] };

export function HomeDashboard() {
  const [data, setData] = useState<HomeData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creation, setCreation] = useState<"project" | "experiment" | "protocol" | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadHomeData());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Home could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadDashboard() {
      try {
        const loaded = await loadHomeData();
        if (!ignore) { setData(loaded); setError(null); }
      } catch (cause) {
        if (!ignore) setError(cause instanceof Error ? cause.message : "Home could not be loaded.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { ignore = true; };
  }, []);

  const continuing = useMemo(
    () => [...data.running, ...data.paused].sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at)).slice(0, 4),
    [data.paused, data.running],
  );
  const currentProjects = data.projects.filter((project) => ["planning", "active", "paused"].includes(project.status)).slice(0, 4);
  const today = data.today.filter((run) => ["planned", "ready", "in_progress", "paused"].includes(run.status));
  const status = data.running.length
    ? `${data.running.length} Experiment${data.running.length === 1 ? " is" : "s are"} running now.`
    : today.length
      ? `${today.length} planned Experiment${today.length === 1 ? " is" : "s are"} visible today.`
      : "No planned or running Experiments are visible today.";

  return <div className={styles.pageStack}>
    <PageHeader description={status} eyebrow="Home" title="Ready for today’s experiments?" />
    {loading ? <Card><LoadingState label="Loading today’s work" /></Card> : error ? <Card><ErrorState title="Home could not be loaded" description={error} onRetry={() => void load()} /></Card> : <>
      {data.running.length ? <DashboardSection description="Experiments with a persisted in-progress state." title="Running Now"><div className={styles.runGrid}>{data.running.map((run) => <RunCard key={run.id} run={run} action="Open execution" prominent />)}</div></DashboardSection> : null}
      <DashboardSection description="Planned starts and relevant execution work for your local calendar day." title="Today">{today.length ? <div className={styles.list}>{today.map((run) => <RunRow key={run.id} run={run} />)}</div> : <CompactEmpty icon={<CalendarDays size={19} />} title="No Experiment is planned for today" description="Only records with a real planned start are shown here." />}</DashboardSection>
      <DashboardSection description="Return directly to work that can still be continued." title="Continue">{continuing.length ? <div className={styles.continueGrid}>{continuing.map((run) => <RunCard key={run.id} run={run} action={run.status === "paused" ? "Review and resume" : "Continue execution"} />)}</div> : <CompactEmpty icon={<Beaker size={19} />} title="Nothing to continue" description="In-progress and paused Experiments will appear here." />}</DashboardSection>
      <DashboardSection action={<Link className={styles.textLink} href="/experiments/projects">View all<ArrowRight aria-hidden="true" size={16} /></Link>} description="Real Projects from the current Workspace." title="Current Projects">{currentProjects.length ? <div className={styles.projectGrid}>{currentProjects.map((project) => <ProjectSummary key={project.id} project={project} />)}</div> : <CompactEmpty icon={<FolderKanban size={19} />} title="No current Projects" description="Create a Project before organizing Experiments and Protocols." />}</DashboardSection>
      <DashboardSection description="Start an implemented creation workflow." title="Quick Actions"><div className={styles.quickActions}><QuickAction icon={<FolderKanban size={20} />} label="New Project" onClick={() => setCreation("project")} />{currentProjects.length ? <QuickAction icon={<Beaker size={20} />} label="New Experiment" onClick={() => setCreation("experiment")} /> : null}{currentProjects[0] ? <QuickAction icon={<BookOpenText size={20} />} label="New Protocol" onClick={() => setCreation("protocol")} /> : null}</div></DashboardSection>
      <DashboardSection description="Latest persisted scientific and record activity." title="Recent">{data.recent.length ? <ol className={styles.activityList}>{data.recent.map((event) => <ActivityRow event={event} key={event.id} />)}</ol> : <CompactEmpty icon={<Activity size={19} />} title="No recent activity" description="Real Project, Protocol, Experiment, note, attachment, and amendment events will appear here." />}</DashboardSection>
      {creation === "project" ? <ProjectFormDialog open onOpenChange={(open) => { if (!open) setCreation(null); }} onSaved={() => { setCreation(null); void load(); }} /> : null}
      {creation === "experiment" ? <ExperimentRunFormDialog open projects={data.projects} protocols={data.protocols} onOpenChange={(open) => { if (!open) setCreation(null); }} onSaved={() => { setCreation(null); void load(); }} /> : null}
      {creation === "protocol" && currentProjects[0] ? <NewProtocolDialog projectId={currentProjects[0].id} onOpenChange={(open) => { if (!open) setCreation(null); }} onSaved={() => { setCreation(null); void load(); }} /> : null}
    </>}
  </div>;
}

async function loadHomeData(): Promise<HomeData> {
  const { start, end } = localDayBounds();
  const [running, paused, today, projects, protocols, recent] = await Promise.all([
    listExperimentRuns({ status: "in_progress" }),
    listExperimentRuns({ status: "paused" }),
    listExperimentRuns({ plannedFrom: start, plannedTo: end }),
    listProjects(),
    listProtocols(),
    listRecentActivity(8),
  ]);
  return { running: running.items, paused: paused.items, today: today.items, projects: projects.items, protocols: protocols.items, recent };
}

function DashboardSection({ action, children, description, title }: { action?: ReactNode; children: ReactNode; description: string; title: string }) {
  return <section aria-labelledby={`home-${title.toLowerCase().replaceAll(" ", "-")}`} className={styles.section}><div className={styles.sectionHeader}><div><h2 id={`home-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h2><p>{description}</p></div>{action}</div>{children}</section>;
}

function RunCard({ action, prominent = false, run }: { action: string; prominent?: boolean; run: ExperimentRun }) {
  return <Card className={prominent ? styles.runningCard : styles.runCard}><CardHeader><div><CardTitle>{run.title}</CardTitle><CardDescription>{run.purpose ?? run.description ?? "No purpose recorded."}</CardDescription></div><ExperimentRunStatusBadge status={run.status} /></CardHeader><CardContent className={styles.runCardBody}>{run.planned_start_at ? <span><CalendarDays aria-hidden="true" size={16} />Planned {formatDateTime(run.planned_start_at)}</span> : <span><CirclePlay aria-hidden="true" size={16} />Actual start {formatDateTime(run.actual_start_at)}</span>}<Link href={`/experiments/runs/${run.id}`}>{action}<ArrowRight aria-hidden="true" size={16} /></Link></CardContent></Card>;
}

function RunRow({ run }: { run: ExperimentRun }) {
  return <Link className={styles.runRow} href={`/experiments/runs/${run.id}`}><div className={styles.rowIcon}>{run.status === "paused" ? <Pause aria-hidden="true" size={18} /> : <CalendarDays aria-hidden="true" size={18} />}</div><div><strong>{run.title}</strong><span>{formatDateTime(run.planned_start_at)}</span></div><ExperimentRunStatusBadge status={run.status} /><ArrowRight aria-hidden="true" size={17} /></Link>;
}

function ProjectSummary({ project }: { project: Project }) {
  return <Card className={styles.projectCard}><CardHeader><CardTitle>{project.title}</CardTitle><ProjectStatusBadge status={project.status} /></CardHeader><CardContent className={styles.projectBody}><p>{project.description ?? project.objective ?? "No description or objective recorded."}</p>{project.tags.length ? <div className={styles.tags}>{project.tags.slice(0, 4).map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}</div> : null}<Link href={`/experiments/projects/${project.id}`}>Open Project<ArrowRight aria-hidden="true" size={16} /></Link></CardContent></Card>;
}

function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={styles.quickAction} type="button" onClick={onClick}><span>{icon}</span><strong>{label}</strong><ArrowRight aria-hidden="true" size={17} /></button>;
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const href = event.experiment_run_id ? `/experiments/runs/${event.experiment_run_id}` : event.protocol_id && event.project_id ? `/experiments/projects/${event.project_id}/protocols/${event.protocol_id}` : event.project_id ? `/experiments/projects/${event.project_id}` : null;
  const content = <><Activity aria-hidden="true" size={17} /><div><strong>{event.message}</strong><time dateTime={event.created_at}>{formatDateTime(event.created_at)}</time></div>{href ? <ArrowRight aria-hidden="true" size={16} /> : null}</>;
  return <li>{href ? <Link href={href}>{content}</Link> : <div>{content}</div>}</li>;
}

function CompactEmpty({ description, icon, title }: { description: string; icon: ReactNode; title: string }) {
  return <div className={styles.compactEmpty}><span>{icon}</span><div><strong>{title}</strong><p>{description}</p></div></div>;
}

function localDayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
