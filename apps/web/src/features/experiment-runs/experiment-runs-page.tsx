"use client";

import { Beaker, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Select } from "@/components/ui";
import { listProjects } from "@/features/projects/api";
import type { Project } from "@/features/projects/types";
import { listProtocols } from "@/features/protocols/api";
import { protocolVersionLabel, type Protocol } from "@/features/protocols/types";

import { listExperimentRuns } from "./api";
import { ArchiveExperimentRunDialog } from "./archive-experiment-run-dialog";
import { ExperimentRunFormDialog } from "./experiment-run-form-dialog";
import styles from "./experiment-runs.module.css";
import { formatDateTime, ExperimentRunStatusBadge } from "./presenters";
import type { ExperimentRun, ExperimentRunStatus } from "./types";

type FilterStatus = Exclude<ExperimentRunStatus, "archived"> | "";

export function ExperimentRunsPage({ projectId }: { projectId?: string }) {
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [status, setStatus] = useState<FilterStatus>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ExperimentRun | null>(null);
  const [archiving, setArchiving] = useState<ExperimentRun | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [runResponse, projectResponse, protocolResponse] = await Promise.all([
        listExperimentRuns({ archived, projectId, search, status }),
        listProjects(),
        listProtocols(projectId),
      ]);
      setRuns(runResponse.items);
      setProjects(projectResponse.items);
      setProtocols(protocolResponse.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Experiments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [archived, projectId, search, status]);

  useEffect(() => {
    let ignore = false;
    async function loadForFilters() {
      try {
        const [runResponse, projectResponse, protocolResponse] = await Promise.all([
          listExperimentRuns({ archived, projectId, search, status }),
          listProjects(),
          listProtocols(projectId),
        ]);
        if (!ignore) {
          setRuns(runResponse.items);
          setProjects(projectResponse.items);
          setProtocols(protocolResponse.items);
          setError(null);
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "Experiments could not be loaded.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadForFilters();
    return () => {
      ignore = true;
    };
  }, [archived, projectId, search, status]);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.title])),
    [projects],
  );
  const protocolVersionNames = useMemo(
    () => new Map(protocols.flatMap((protocol) => protocol.versions.map((version) => [version.id, protocolVersionLabel(protocol, version)] as const))),
    [protocols],
  );
  const contextProject = projects.find((project) => project.id === projectId);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSearch(searchInput.trim());
  }

  return (
    <div className={styles.pageStack}>
      <PageHeader
        action={<Button disabled={!projects.length} onClick={() => setCreating(true)}><Plus aria-hidden="true" size={17} />New Experiment</Button>}
        breadcrumb={projectId
          ? [{ href: "/experiments/projects", label: "Projects" }, { href: `/experiments/projects/${projectId}`, label: contextProject?.title ?? "Project" }, { label: "Experiments" }]
          : [{ href: "/", label: "Home" }, { label: "All Experiments" }]}
        description={projectId ? "Plan and manage real experimental work inside this Project." : "View real Experiments across current Projects."}
        eyebrow="Experiments"
        title={projectId ? "Project Experiments" : "All Experiments"}
      />

      <Card className={styles.filtersCard}>
        <div className={styles.viewToggle} role="group" aria-label="Experiment list">
          <button aria-pressed={!archived} type="button" onClick={() => { setLoading(true); setArchived(false); setStatus(""); }}>Current</button>
          <button aria-pressed={archived} type="button" onClick={() => { setLoading(true); setArchived(true); setStatus(""); }}>Archived</button>
        </div>
        <form className={styles.filters} role="search" onSubmit={submitSearch}>
          {!archived ? (
            <Field label="Status">{(props) => (
              <Select {...props} value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as FilterStatus); }}>
                <option value="">All current statuses</option>
                <option value="draft">Draft</option><option value="planned">Planned</option><option value="ready">Ready</option>
                <option value="in_progress">In progress</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </Select>
            )}</Field>
          ) : null}
          <Field label="Search Experiments">{(props) => (
            <div className={styles.searchControl}>
              <Input {...props} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, purpose, or description" />
              <Button aria-label="Search Experiments" size="icon" type="submit" variant="secondary"><Search aria-hidden="true" size={18} /></Button>
            </div>
          )}</Field>
        </form>
      </Card>

      {loading ? <Card><LoadingState label="Loading Experiments" /></Card>
        : error ? <Card><ErrorState title="Experiments could not be loaded" description={error} onRetry={() => void load()} /></Card>
        : runs.length ? (
          <div className={styles.runList}>
            {runs.map((run) => (
              <Card className={styles.runCard} key={run.id}>
                <div className={styles.runHeader}>
                  <div><Link href={`/experiments/runs/${run.id}`}><h2>{run.title}</h2></Link><p>{run.purpose ?? run.description ?? "No purpose recorded."}</p></div>
                  <ExperimentRunStatusBadge status={run.status} />
                </div>
                <dl className={styles.runMetadata}>
                  <div><dt>Project</dt><dd>{projectNames.get(run.project_id) ?? "Project unavailable"}</dd></div>
                  <div><dt>Protocol</dt><dd>{run.protocol_version_id ? protocolVersionNames.get(run.protocol_version_id) ?? "Version unavailable" : "None"}</dd></div>
                  <div><dt>Planned start</dt><dd>{formatDateTime(run.planned_start_at)}</dd></div>
                  <div><dt>Actual start</dt><dd>{formatDateTime(run.actual_start_at)}</dd></div>
                </dl>
                <div className={styles.cardActions}>
                  {run.status !== "archived" ? <><Button size="small" variant="ghost" onClick={() => setEditing(run)}>Edit</Button><Button size="small" variant="ghost" onClick={() => setArchiving(run)}>Archive</Button></> : null}
                  <Link href={`/experiments/runs/${run.id}`}>Open Experiment</Link>
                </div>
              </Card>
            ))}
          </div>
        ) : <Card><EmptyState title={archived ? "No archived Experiments" : "No Experiments yet"} description={archived ? "Archived Experiments remain preserved and will appear here." : "Create an Experiment to record planned work separately from actual execution."} icon={<Beaker size={23} />} action={!archived && projects.length ? <Button variant="secondary" onClick={() => setCreating(true)}>New Experiment</Button> : undefined} /></Card>}

      {creating ? <ExperimentRunFormDialog open projects={projects} protocols={protocols} fixedProjectId={projectId} onOpenChange={setCreating} onSaved={() => void load()} /> : null}
      {editing ? <ExperimentRunFormDialog open projects={projects} protocols={protocols} run={editing} onOpenChange={(open) => { if (!open) setEditing(null); }} onSaved={() => { setEditing(null); void load(); }} /> : null}
      {archiving ? <ArchiveExperimentRunDialog open run={archiving} onOpenChange={(open) => { if (!open) setArchiving(null); }} onArchived={() => { setArchiving(null); void load(); }} /> : null}
    </div>
  );
}
