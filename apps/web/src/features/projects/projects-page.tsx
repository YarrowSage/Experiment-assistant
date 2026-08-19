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

import { listProjects } from "./api";
import { ArchiveProjectDialog } from "./archive-project-dialog";
import { ProjectCard } from "./project-card";
import { ProjectFormDialog } from "./project-form-dialog";
import styles from "./projects.module.css";
import type { Project, ProjectStatus } from "./types";

type CurrentStatus = Exclude<ProjectStatus, "archived"> | "";

export function ProjectsPage() {
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
      setLoadError(error instanceof Error ? error.message : "Projects could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [archived, search, status]);

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
          setLoadError(error instanceof Error ? error.message : "Projects could not be loaded.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadForFilters();
    return () => {
      ignore = true;
    };
  }, [archived, search, status]);

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
            New Project
          </Button>
        }
        breadcrumb={[{ href: "/", label: "Home" }, { label: "Projects" }]}
        description="Organize scientific goals, planning context, and the work that will follow."
        eyebrow="Experiments"
        title="Projects"
      />

      <Card className={styles.filtersCard}>
        <div className={styles.viewToggle} aria-label="Project list" role="group">
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
            Current
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
            Archived
          </button>
        </div>
        <form className={styles.filterForm} role="search" onSubmit={handleSearch}>
          {!archived ? (
            <Field label="Status">
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
                  <option value="">All current statuses</option>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </Select>
              )}
            </Field>
          ) : null}
          <Field label="Search projects">
            {(props) => (
              <div className={styles.searchControl}>
                <Input
                  {...props}
                  placeholder="Name, description, or objective"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <Button aria-label="Search projects" size="icon" type="submit" variant="secondary">
                  <Search aria-hidden="true" size={18} />
                </Button>
              </div>
            )}
          </Field>
        </form>
      </Card>

      {loading ? (
        <Card>
          <LoadingState label="Loading projects" />
        </Card>
      ) : loadError ? (
        <Card>
          <ErrorState
            description={loadError}
            title="Projects could not be loaded"
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
                  New Project
                </Button>
              )
            }
            description={
              archived
                ? "Archived Projects remain preserved and will appear here when available."
                : search || status
                  ? "No current Projects match these filters."
                  : "Create the first Project to establish its scientific objective and planning context."
            }
            icon={<FolderKanban size={23} />}
            title={archived ? "No archived Projects" : "No Projects yet"}
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
