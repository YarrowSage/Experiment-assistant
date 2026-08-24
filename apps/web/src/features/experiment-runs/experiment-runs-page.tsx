"use client";

import { Beaker, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Select } from "@/components/ui";
import { listProjects } from "@/features/projects/api";
import type { Project } from "@/features/projects/types";
import { listProtocols } from "@/features/protocols/api";
import { protocolVersionLabel, type Protocol } from "@/features/protocols/types";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { listExperimentRuns } from "./api";
import { ArchiveExperimentRunDialog } from "./archive-experiment-run-dialog";
import { ExperimentRunFormDialog } from "./experiment-run-form-dialog";
import styles from "./experiment-runs.module.css";
import { formatDateTime, ExperimentRunStatusBadge } from "./presenters";
import type { ExperimentRun, ExperimentRunStatus } from "./types";

type FilterStatus = Exclude<ExperimentRunStatus, "archived"> | "";

export function ExperimentRunsPage({ projectId }: { projectId?: string }) {
  const { locale, t } = useLocalization();
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
      setError(presentError(cause, t, "experiments.loadError"));
    } finally {
      setLoading(false);
    }
  }, [archived, projectId, search, status, t]);

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
          setError(presentError(cause, t, "experiments.loadError"));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadForFilters();
    return () => {
      ignore = true;
    };
  }, [archived, projectId, search, status, t]);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.title])),
    [projects],
  );
  const protocolVersionNames = useMemo(
    () => new Map(protocols.flatMap((protocol) => protocol.versions.map((version) => [version.id, protocolVersionLabel(protocol, version, t)] as const))),
    [protocols, t],
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
        action={<Button disabled={!projects.length} onClick={() => setCreating(true)}><Plus aria-hidden="true" size={17} />{t("experiments.new")}</Button>}
        breadcrumb={projectId
          ? [{ href: "/experiments/projects", label: t("projects.title") }, { href: `/experiments/projects/${projectId}`, label: contextProject?.title ?? t("common.project") }, { label: t("common.experiments") }]
          : [{ href: "/", label: t("navigation.home") }, { label: t("experiments.allTitle") }]}
        description={projectId ? t("experiments.projectDescription") : t("experiments.allDescription")}
        eyebrow={t("navigation.experiments")}
        title={projectId ? t("experiments.projectTitle") : t("experiments.allTitle")}
      />

      <Card className={styles.filtersCard}>
        <div className={styles.viewToggle} role="group" aria-label={t("accessibility.experimentList")}>
          <button aria-pressed={!archived} type="button" onClick={() => { setLoading(true); setArchived(false); setStatus(""); }}>{t("common.current")}</button>
          <button aria-pressed={archived} type="button" onClick={() => { setLoading(true); setArchived(true); setStatus(""); }}>{t("common.archived")}</button>
        </div>
        <form className={styles.filters} role="search" onSubmit={submitSearch}>
          {!archived ? (
            <Field label={t("common.status")}>{(props) => (
              <Select {...props} value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as FilterStatus); }}>
                <option value="">{t("experiments.allStatuses")}</option>
                <option value="draft">{t("status.draft")}</option><option value="planned">{t("status.planned")}</option><option value="ready">{t("status.ready")}</option>
                <option value="in_progress">{t("status.inProgress")}</option><option value="paused">{t("status.paused")}</option><option value="completed">{t("status.completed")}</option><option value="cancelled">{t("status.cancelled")}</option>
              </Select>
            )}</Field>
          ) : null}
          <Field label={t("experiments.searchLabel")}>{(props) => (
            <div className={styles.searchControl}>
              <Input {...props} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t("experiments.searchPlaceholder")} />
              <Button aria-label={t("experiments.searchLabel")} size="icon" type="submit" variant="secondary"><Search aria-hidden="true" size={18} /></Button>
            </div>
          )}</Field>
        </form>
      </Card>

      {loading ? <Card><LoadingState label={t("experiments.loading")} /></Card>
        : error ? <Card><ErrorState title={t("experiments.loadError")} description={error} onRetry={() => void load()} /></Card>
        : runs.length ? (
          <div className={styles.runList}>
            {runs.map((run) => (
              <Card className={styles.runCard} key={run.id}>
                <div className={styles.runHeader}>
                  <div><Link href={`/experiments/runs/${run.id}`}><h2>{run.title}</h2></Link><p>{run.purpose ?? run.description ?? t("common.noPurpose")}</p></div>
                  <ExperimentRunStatusBadge status={run.status} />
                </div>
                <dl className={styles.runMetadata}>
                  <div><dt>{t("common.project")}</dt><dd>{projectNames.get(run.project_id) ?? t("common.projectUnavailable")}</dd></div>
                  <div><dt>{t("common.protocol")}</dt><dd>{run.protocol_version_id ? protocolVersionNames.get(run.protocol_version_id) ?? t("common.versionUnavailable") : t("common.none")}</dd></div>
                  <div><dt>{t("experiments.plannedStart")}</dt><dd>{formatDateTime(run.planned_start_at, locale, t("common.notRecorded"))}</dd></div>
                  <div><dt>{t("experiments.actualStart")}</dt><dd>{formatDateTime(run.actual_start_at, locale, t("common.notRecorded"))}</dd></div>
                </dl>
                <div className={styles.cardActions}>
                  {run.status !== "archived" ? <><Button size="small" variant="ghost" onClick={() => setEditing(run)}>{t("common.edit")}</Button><Button size="small" variant="ghost" onClick={() => setArchiving(run)}>{t("common.archive")}</Button></> : null}
                  <Link href={`/experiments/runs/${run.id}`}>{t("experiments.open")}</Link>
                </div>
              </Card>
            ))}
          </div>
        ) : <Card><EmptyState title={archived ? t("experiments.noArchived") : t("experiments.none")} description={archived ? t("experiments.archivedEmpty") : t("experiments.empty")} icon={<Beaker size={23} />} action={!archived && projects.length ? <Button variant="secondary" onClick={() => setCreating(true)}>{t("experiments.new")}</Button> : undefined} /></Card>}

      {creating ? <ExperimentRunFormDialog open projects={projects} protocols={protocols} fixedProjectId={projectId} onOpenChange={setCreating} onSaved={() => void load()} /> : null}
      {editing ? <ExperimentRunFormDialog open projects={projects} protocols={protocols} run={editing} onOpenChange={(open) => { if (!open) setEditing(null); }} onSaved={() => { setEditing(null); void load(); }} /> : null}
      {archiving ? <ArchiveExperimentRunDialog open run={archiving} onOpenChange={(open) => { if (!open) setArchiving(null); }} onArchived={() => { setArchiving(null); void load(); }} /> : null}
    </div>
  );
}
