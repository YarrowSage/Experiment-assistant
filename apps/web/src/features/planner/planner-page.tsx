"use client";

import { CalendarDays, Info, Timer } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, ErrorState, LoadingState, PageHeader, Tabs } from "@/components/ui";
import { listExperimentRuns } from "@/features/experiment-runs/api";
import { formatDateTime, ExperimentRunStatusBadge } from "@/features/experiment-runs/presenters";
import type { ExperimentRun } from "@/features/experiment-runs/types";
import { listProjects } from "@/features/projects/api";

import styles from "./planner.module.css";

type PlannerData = { today: ExperimentRun[]; upcoming: ExperimentRun[]; projectNames: Map<string, string> };

export function PlannerPage() {
  const [data, setData] = useState<PlannerData>({ today: [], upcoming: [], projectNames: new Map() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await loadPlannerData()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Planner could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadPlanner() {
      try {
        const loaded = await loadPlannerData();
        if (!ignore) { setData(loaded); setError(null); }
      } catch (cause) {
        if (!ignore) setError(cause instanceof Error ? cause.message : "Planner could not be loaded.");
      } finally { if (!ignore) setLoading(false); }
    }
    void loadPlanner();
    return () => { ignore = true; };
  }, []);

  const today = useMemo(() => relevantPlannedRuns(data.today), [data.today]);
  const upcoming = useMemo(() => relevantPlannedRuns(data.upcoming), [data.upcoming]);

  return <div className={styles.pageStack}>
    <PageHeader breadcrumb={[{ href: "/", label: "Home" }, { label: "Planner" }]} description="Basic date-based visibility for real ExperimentRuns with planned start times." eyebrow="Planning" title="Planner" />
    {loading ? <Card><LoadingState label="Loading planned Experiments" /></Card> : error ? <Card><ErrorState title="Planner could not be loaded" description={error} onRetry={() => void load()} /></Card> : <Tabs ariaLabel="Planner views" defaultValue="today" items={[
      { value: "today", label: "Today", content: <RunSchedule emptyDescription="Experiments with a planned start in your local calendar day will appear here." emptyTitle="Nothing planned for today" projectNames={data.projectNames} runs={today} /> },
      { value: "upcoming", label: "Upcoming", content: <RunSchedule emptyDescription="Future planned starts will appear here in chronological order." emptyTitle="No upcoming Experiments" projectNames={data.projectNames} runs={upcoming} /> },
    ]} />}
    <Card className={styles.boundaryCard}><Info aria-hidden="true" size={20} /><div><CardTitle>Phase 1 planning boundary</CardTitle><CardDescription>This view reads existing planned start times. Dependencies, automatic shifting, advanced rescheduling, and Week/Month planning are not implemented.</CardDescription></div></Card>
  </div>;
}

function RunSchedule({ emptyDescription, emptyTitle, projectNames, runs }: { emptyDescription: string; emptyTitle: string; projectNames: Map<string, string>; runs: ExperimentRun[] }) {
  if (!runs.length) return <Card><EmptyState icon={<CalendarDays size={22} />} title={emptyTitle} description={emptyDescription} /></Card>;
  return <div className={styles.runList}>{runs.map((run) => <Card className={styles.runCard} key={run.id}><CardHeader><div><CardTitle>{run.title}</CardTitle><CardDescription>{projectNames.get(run.project_id) ?? "Project unavailable"}</CardDescription></div><ExperimentRunStatusBadge status={run.status} /></CardHeader><CardContent className={styles.runBody}><span><Timer aria-hidden="true" size={17} />{formatDateTime(run.planned_start_at)}</span><p>{run.purpose ?? run.description ?? "No purpose recorded."}</p><Link href={`/experiments/runs/${run.id}`}>Open Experiment</Link></CardContent></Card>)}</div>;
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
