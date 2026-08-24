"use client";

import { CalendarDays, Info, Timer } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, ErrorState, LoadingState, PageHeader, Tabs } from "@/components/ui";
import { listExperimentRuns } from "@/features/experiment-runs/api";
import { formatDateTime, ExperimentRunStatusBadge } from "@/features/experiment-runs/presenters";
import type { ExperimentRun } from "@/features/experiment-runs/types";
import { listProjects } from "@/features/projects/api";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import styles from "./planner.module.css";

type PlannerData = { today: ExperimentRun[]; upcoming: ExperimentRun[]; projectNames: Map<string, string> };

export function PlannerPage() {
  const { t } = useLocalization();
  const [data, setData] = useState<PlannerData>({ today: [], upcoming: [], projectNames: new Map() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await loadPlannerData()); }
    catch (cause) { setError(presentError(cause, t, "planner.loadError")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => {
    let ignore = false;
    async function loadPlanner() {
      try {
        const loaded = await loadPlannerData();
        if (!ignore) { setData(loaded); setError(null); }
      } catch (cause) {
        if (!ignore) setError(presentError(cause, t, "planner.loadError"));
      } finally { if (!ignore) setLoading(false); }
    }
    void loadPlanner();
    return () => { ignore = true; };
  }, [t]);

  const today = useMemo(() => relevantPlannedRuns(data.today), [data.today]);
  const upcoming = useMemo(() => relevantPlannedRuns(data.upcoming), [data.upcoming]);

  return <div className={styles.pageStack}>
    <PageHeader breadcrumb={[{ href: "/", label: t("navigation.home") }, { label: t("planner.title") }]} description={t("planner.description")} eyebrow={t("planner.eyebrow")} title={t("planner.title")} />
    {loading ? <Card><LoadingState label={t("planner.loading")} /></Card> : error ? <Card><ErrorState title={t("planner.loadError")} description={error} onRetry={() => void load()} /></Card> : <Tabs ariaLabel={t("accessibility.plannerViews")} defaultValue="today" items={[
      { value: "today", label: t("planner.today"), content: <RunSchedule emptyDescription={t("planner.todayEmptyDescription")} emptyTitle={t("planner.todayEmpty")} projectNames={data.projectNames} runs={today} /> },
      { value: "upcoming", label: t("planner.upcoming"), content: <RunSchedule emptyDescription={t("planner.upcomingEmptyDescription")} emptyTitle={t("planner.upcomingEmpty")} projectNames={data.projectNames} runs={upcoming} /> },
    ]} />}
    <Card className={styles.boundaryCard}><Info aria-hidden="true" size={20} /><div><CardTitle>{t("planner.boundaryTitle")}</CardTitle><CardDescription>{t("planner.boundaryDescription")}</CardDescription></div></Card>
  </div>;
}

function RunSchedule({ emptyDescription, emptyTitle, projectNames, runs }: { emptyDescription: string; emptyTitle: string; projectNames: Map<string, string>; runs: ExperimentRun[] }) {
  const { locale, t } = useLocalization();
  if (!runs.length) return <Card><EmptyState icon={<CalendarDays size={22} />} title={emptyTitle} description={emptyDescription} /></Card>;
  return <div className={styles.runList}>{runs.map((run) => <Card className={styles.runCard} key={run.id}><CardHeader><div><CardTitle>{run.title}</CardTitle><CardDescription>{projectNames.get(run.project_id) ?? t("common.projectUnavailable")}</CardDescription></div><ExperimentRunStatusBadge status={run.status} /></CardHeader><CardContent className={styles.runBody}><span><Timer aria-hidden="true" size={17} />{formatDateTime(run.planned_start_at, locale, t("common.notRecorded"))}</span><p>{run.purpose ?? run.description ?? t("common.noPurpose")}</p><Link href={`/experiments/runs/${run.id}`}>{t("experiments.open")}</Link></CardContent></Card>)}</div>;
}

async function loadPlannerData(): Promise<PlannerData> {
  const { start, end } = localDayBounds();
  const [today, upcoming, projects] = await Promise.all([
    listExperimentRuns({ plannedFrom: start, plannedTo: end }),
    listExperimentRuns({ plannedFrom: end }),
    listProjects(),
  ]);
  return { today: today.items, upcoming: upcoming.items, projectNames: new Map(projects.items.map((project) => [project.id, project.title])) };
}

function relevantPlannedRuns(runs: ExperimentRun[]) {
  return runs.filter((run) => ["planned", "ready", "in_progress", "paused"].includes(run.status));
}

function localDayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
