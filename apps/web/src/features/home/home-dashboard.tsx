"use client";

import { Activity, ArrowRight, Beaker, BookOpenText, CalendarDays, CirclePlay, FolderKanban, Pause } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { listRecentActivity } from "@/features/evidence/api";
import { activityMessage } from "@/features/evidence/activity-presenter";
import type { ActivityEvent } from "@/features/evidence/types";
import { listExperimentRuns } from "@/features/experiment-runs/api";
import { ExperimentRunFormDialog } from "@/features/experiment-runs/experiment-run-form-dialog";
import { formatDateTime, ExperimentRunStatusBadge } from "@/features/experiment-runs/presenters";
import type { ExperimentRun } from "@/features/experiment-runs/types";
import { listProjects } from "@/features/projects/api";
import { ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { ProjectStatusBadge } from "@/features/projects/project-presenters";
import type { Project } from "@/features/projects/types";
import { presentError } from "@/locales";
import { listProtocols } from "@/features/protocols/api";
import { NewProtocolDialog } from "@/features/protocols/protocols-page";
import type { Protocol } from "@/features/protocols/types";
import { useLocalization } from "@/locales/localization-provider";

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
  const { t } = useLocalization();
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
      setError(presentError(cause, t, "home.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let ignore = false;
    async function loadDashboard() {
      try {
        const loaded = await loadHomeData();
        if (!ignore) { setData(loaded); setError(null); }
      } catch (cause) {
        if (!ignore) setError(presentError(cause, t, "home.loadError"));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { ignore = true; };
  }, [t]);

  const continuing = useMemo(
    () => [...data.running, ...data.paused].sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at)).slice(0, 4),
    [data.paused, data.running],
  );
  const currentProjects = data.projects.filter((project) => ["planning", "active", "paused"].includes(project.status)).slice(0, 4);
  const today = data.today.filter((run) => ["planned", "ready", "in_progress", "paused"].includes(run.status));
  const status = data.running.length
    ? t("home.statusRunning", { count: data.running.length })
    : today.length
      ? t("home.statusPlanned", { count: today.length })
      : t("home.statusEmpty");

  return <div className={styles.pageStack}>
    <PageHeader description={status} eyebrow={t("home.eyebrow")} title={t("home.title")} />
    {loading ? <Card><LoadingState label={t("home.loading")} /></Card> : error ? <Card><ErrorState title={t("home.loadError")} description={error} onRetry={() => void load()} /></Card> : <>
      {data.running.length ? <DashboardSection description={t("home.runningDescription")} title={t("home.runningNow")}><div className={styles.runGrid}>{data.running.map((run) => <RunCard key={run.id} run={run} action={t("home.openExecution")} prominent />)}</div></DashboardSection> : null}
      <DashboardSection description={t("home.todayDescription")} title={t("home.today")}>{today.length ? <div className={styles.list}>{today.map((run) => <RunRow key={run.id} run={run} />)}</div> : <CompactEmpty icon={<CalendarDays size={19} />} title={t("home.todayEmptyTitle")} description={t("home.todayEmptyDescription")} />}</DashboardSection>
      <DashboardSection description={t("home.continueDescription")} title={t("home.continue")}>{continuing.length ? <div className={styles.continueGrid}>{continuing.map((run) => <RunCard key={run.id} run={run} action={run.status === "paused" ? t("home.reviewResume") : t("home.continueExecution")} />)}</div> : <CompactEmpty icon={<Beaker size={19} />} title={t("home.continueEmptyTitle")} description={t("home.continueEmptyDescription")} />}</DashboardSection>
      <DashboardSection action={<Link className={styles.textLink} href="/experiments/projects">{t("home.viewAll")}<ArrowRight aria-hidden="true" size={16} /></Link>} description={t("home.currentProjectsDescription")} title={t("home.currentProjects")}>{currentProjects.length ? <div className={styles.projectGrid}>{currentProjects.map((project) => <ProjectSummary key={project.id} project={project} />)}</div> : <CompactEmpty icon={<FolderKanban size={19} />} title={t("home.noCurrentProjects")} description={t("home.noCurrentProjectsDescription")} />}</DashboardSection>
      <DashboardSection description={t("home.quickActionsDescription")} title={t("home.quickActions")}><div className={styles.quickActions}><QuickAction icon={<FolderKanban size={20} />} label={t("projects.new")} onClick={() => setCreation("project")} />{currentProjects.length ? <QuickAction icon={<Beaker size={20} />} label={t("experiments.new")} onClick={() => setCreation("experiment")} /> : null}{currentProjects[0] ? <QuickAction icon={<BookOpenText size={20} />} label={t("protocols.new")} onClick={() => setCreation("protocol")} /> : null}</div></DashboardSection>
      <DashboardSection description={t("home.recentDescription")} title={t("home.recent")}>{data.recent.length ? <ol className={styles.activityList}>{data.recent.map((event) => <ActivityRow event={event} key={event.id} />)}</ol> : <CompactEmpty icon={<Activity size={19} />} title={t("home.noRecentActivity")} description={t("home.noRecentActivityDescription")} />}</DashboardSection>
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
  const { locale, t } = useLocalization();
  return <Card className={prominent ? styles.runningCard : styles.runCard}><CardHeader><div><CardTitle>{run.title}</CardTitle><CardDescription>{run.purpose ?? run.description ?? t("common.noPurpose")}</CardDescription></div><ExperimentRunStatusBadge status={run.status} /></CardHeader><CardContent className={styles.runCardBody}>{run.planned_start_at ? <span><CalendarDays aria-hidden="true" size={16} />{t("home.plannedAt", { date: formatDateTime(run.planned_start_at, locale, t("common.notRecorded")) })}</span> : <span><CirclePlay aria-hidden="true" size={16} />{t("home.actualStartAt", { date: formatDateTime(run.actual_start_at, locale, t("common.notRecorded")) })}</span>}<Link href={`/experiments/runs/${run.id}`}>{action}<ArrowRight aria-hidden="true" size={16} /></Link></CardContent></Card>;
}

function RunRow({ run }: { run: ExperimentRun }) {
  const { locale, t } = useLocalization();
  return <Link className={styles.runRow} href={`/experiments/runs/${run.id}`}><div className={styles.rowIcon}>{run.status === "paused" ? <Pause aria-hidden="true" size={18} /> : <CalendarDays aria-hidden="true" size={18} />}</div><div><strong>{run.title}</strong><span>{formatDateTime(run.planned_start_at, locale, t("common.notRecorded"))}</span></div><ExperimentRunStatusBadge status={run.status} /><ArrowRight aria-hidden="true" size={17} /></Link>;
}

function ProjectSummary({ project }: { project: Project }) {
  const { t } = useLocalization();
  return <Card className={styles.projectCard}><CardHeader><CardTitle>{project.title}</CardTitle><ProjectStatusBadge status={project.status} /></CardHeader><CardContent className={styles.projectBody}><p>{project.description ?? project.objective ?? t("home.noProjectSummary")}</p>{project.tags.length ? <div className={styles.tags}>{project.tags.slice(0, 4).map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}</div> : null}<Link href={`/experiments/projects/${project.id}`}>{t("home.openProject")}<ArrowRight aria-hidden="true" size={16} /></Link></CardContent></Card>;
}

function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={styles.quickAction} type="button" onClick={onClick}><span>{icon}</span><strong>{label}</strong><ArrowRight aria-hidden="true" size={17} /></button>;
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const { locale, t } = useLocalization();
  const href = event.experiment_run_id ? `/experiments/runs/${event.experiment_run_id}` : event.protocol_id && event.project_id ? `/experiments/projects/${event.project_id}/protocols/${event.protocol_id}` : event.project_id ? `/experiments/projects/${event.project_id}` : null;
  const content = <><Activity aria-hidden="true" size={17} /><div><strong>{activityMessage(event, t)}</strong><time dateTime={event.created_at}>{formatDateTime(event.created_at, locale)}</time></div>{href ? <ArrowRight aria-hidden="true" size={16} /> : null}</>;
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
