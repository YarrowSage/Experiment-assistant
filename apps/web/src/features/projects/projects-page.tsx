"use client";

import { FolderKanban, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
} from "@/components/ui";
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { listProjects } from "./api";
import { ArchiveProjectDialog } from "./archive-project-dialog";
import { ProjectCard } from "./project-card";
import { ProjectFormDialog } from "./project-form-dialog";
import styles from "./projects.module.css";
import type { Project, ProjectStatus } from "./types";

type CurrentStatus = Exclude<ProjectStatus, "archived"> | "";

export function ProjectsPage() {
  const { t } = useLocalization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [status, setStatus] = useState<CurrentStatus>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archivingProject, setArchivingProject] = useState<Project | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listProjects({ archived, search, status });
      setProjects(response.items);
    } catch (error) {
      setLoadError(presentError(error, t, "projects.loadError"));
    } finally {
      setLoading(false);
    }
  }, [archived, search, status, t]);

  useEffect(() => {
    let ignore = false;
    async function loadForFilters() {
      try {
        const response = await listProjects({ archived, search, status });
        if (!ignore) {
          setProjects(response.items);
          setLoadError(null);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(presentError(error, t, "projects.loadError"));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadForFilters();
    return () => {
      ignore = true;
    };
  }, [archived, search, status, t]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    if (nextSearch === search) {
      void load();
      return;
    }
    setLoading(true);
    setSearch(nextSearch);
  }

  function handleSaved(saved: Project) {
    setEditingProject(null);
    setNewProjectOpen(false);
    if (archived === (saved.status === "archived")) void load();
  }

  function handleArchived() {
    setArchivingProject(null);
    void load();
  }

  return (
    <div className={styles.pageStack}>
      <PageHeader
        action={
          <Button onClick={() => setNewProjectOpen(true)}>
            <Plus aria-hidden="true" size={17} />
            {t("projects.new")}
          </Button>
        }
        breadcrumb={[{ href: "/", label: t("navigation.home") }, { label: t("projects.title") }]}
        description={t("projects.description")}
        eyebrow={t("navigation.experiments")}
        title={t("projects.title")}
      />

      <Card className={styles.filtersCard}>
        <div className={styles.viewToggle} aria-label={t("accessibility.projectList")} role="group">
          <button
            aria-pressed={!archived}
            type="button"
            onClick={() => {
              if (archived) {
                setLoading(true);
                setArchived(false);
                setStatus("");
              }
            }}
          >
            {t("common.current")}
          </button>
          <button
            aria-pressed={archived}
            type="button"
            onClick={() => {
              if (!archived) {
                setLoading(true);
                setArchived(true);
                setStatus("");
              }
            }}
          >
            {t("common.archived")}
          </button>
        </div>
        <form className={styles.filterForm} role="search" onSubmit={handleSearch}>
          {!archived ? (
            <Field label={t("common.status")}>
              {(props) => (
                <Select
                  {...props}
                  value={status}
                  onChange={(event) => {
                    const nextStatus = event.target.value as CurrentStatus;
                    if (nextStatus !== status) {
                      setLoading(true);
                      setStatus(nextStatus);
                    }
                  }}
                >
                  <option value="">{t("projects.currentStatuses")}</option>
                  <option value="planning">{t("status.planning")}</option>
                  <option value="active">{t("status.active")}</option>
                  <option value="paused">{t("status.paused")}</option>
                  <option value="completed">{t("status.completed")}</option>
                </Select>
              )}
            </Field>
          ) : null}
          <Field label={t("projects.searchLabel")}>
            {(props) => (
              <div className={styles.searchControl}>
                <Input
                  {...props}
                  placeholder={t("projects.searchPlaceholder")}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <Button aria-label={t("projects.searchLabel")} size="icon" type="submit" variant="secondary">
                  <Search aria-hidden="true" size={18} />
                </Button>
              </div>
            )}
          </Field>
        </form>
      </Card>

      {loading ? (
        <Card>
          <LoadingState label={t("projects.loading")} />
        </Card>
      ) : loadError ? (
        <Card>
          <ErrorState
            description={loadError}
            title={t("projects.loadError")}
            onRetry={() => void load()}
          />
        </Card>
      ) : projects.length ? (
        <div className={styles.projectList}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onArchive={setArchivingProject}
              onEdit={setEditingProject}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            action={
              archived ? undefined : (
                <Button variant="secondary" onClick={() => setNewProjectOpen(true)}>
                  {t("projects.new")}
                </Button>
              )
            }
            description={
              archived
                ? t("projects.archivedEmpty")
                : search || status
                  ? t("projects.filteredEmpty")
                  : t("projects.empty")
            }
            icon={<FolderKanban size={23} />}
            title={archived ? t("projects.noArchived") : t("projects.noProjects")}
          />
        </Card>
      )}

      {newProjectOpen ? (
        <ProjectFormDialog
          open
          onOpenChange={setNewProjectOpen}
          onSaved={handleSaved}
        />
      ) : null}
      {editingProject ? (
        <ProjectFormDialog
          open
          project={editingProject}
          onOpenChange={(open) => {
            if (!open) setEditingProject(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}
      {archivingProject ? (
        <ArchiveProjectDialog
          open
          project={archivingProject}
          onArchived={handleArchived}
          onOpenChange={(open) => {
            if (!open) setArchivingProject(null);
          }}
        />
      ) : null}
    </div>
  );
}
