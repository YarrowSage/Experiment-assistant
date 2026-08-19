"use client";

import { Archive, CalendarRange, FileText, Pencil, Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

import { getProject } from "./api";
import { ArchiveProjectDialog } from "./archive-project-dialog";
import { formatPlanningDate, formatUpdatedAt, ProjectStatusBadge } from "./project-presenters";
import { ProjectFormDialog } from "./project-form-dialog";
import styles from "./projects.module.css";
import type { Project } from "./types";

export function ProjectOverview({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setProject(await getProject(projectId));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "The Project could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let ignore = false;
    async function loadOverview() {
      try {
        const response = await getProject(projectId);
        if (!ignore) {
          setProject(response);
          setLoadError(null);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(
            error instanceof Error ? error.message : "The Project could not be loaded.",
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadOverview();
    return () => {
      ignore = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <LoadingState label="Loading Project overview" />
      </Card>
    );
  }

  if (loadError || !project) {
    return (
      <Card>
        <ErrorState
          description={loadError ?? "The requested Project was not found."}
          title="Project could not be opened"
          onRetry={() => void load()}
        />
      </Card>
    );
  }

  const archived = project.status === "archived";
  return (
    <div className={styles.pageStack}>
      <PageHeader
        action={
          archived ? undefined : (
            <div className={styles.headerActions}>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" size={17} />
                Edit
              </Button>
              <Button variant="secondary" onClick={() => setArchiving(true)}>
                <Archive aria-hidden="true" size={17} />
                Archive
              </Button>
            </div>
          )
        }
        breadcrumb={[
          { href: "/experiments/projects", label: "Projects" },
          { label: project.title },
        ]}
        description="Project Overview preserves the scientific purpose and planning context."
        eyebrow="Project"
        title={project.title}
      />

      <div className={styles.overviewLayout}>
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <ProjectStatusBadge status={project.status} />
          </CardHeader>
          <CardContent className={styles.detailList}>
            <section>
              <h3>Description</h3>
              <p>{project.description ?? "No description recorded."}</p>
            </section>
            <section>
              <h3>Objective</h3>
              <p>{project.objective ?? "No objective recorded."}</p>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planning details</CardTitle>
          </CardHeader>
          <CardContent className={styles.detailList}>
            <section className={styles.iconDetail}>
              <CalendarRange aria-hidden="true" size={18} />
              <div>
                <h3>Planning range</h3>
                <p>
                  {project.start_date ? formatPlanningDate(project.start_date) : "No start date"}
                  {" – "}
                  {project.end_date ? formatPlanningDate(project.end_date) : "Open ended"}
                </p>
              </div>
            </section>
            <section className={styles.iconDetail}>
              <Tags aria-hidden="true" size={18} />
              <div>
                <h3>Tags</h3>
                {project.tags.length ? (
                  <div className={styles.tagList}>
                    {project.tags.map((tag) => (
                      <span className={styles.tag} key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>No tags recorded.</p>
                )}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project record</CardTitle>
        </CardHeader>
        <CardContent className={styles.recordMetadata}>
          <span>
            Created <time dateTime={project.created_at}>{formatUpdatedAt(project.created_at)}</time>
          </span>
          <span>
            Updated <time dateTime={project.updated_at}>{formatUpdatedAt(project.updated_at)}</time>
          </span>
          <span>Revision {project.revision}</span>
        </CardContent>
      </Card>

      <Card>
        <div className={styles.plannedModules}>
          <FileText aria-hidden="true" size={23} />
          <div>
            <h2>Project modules are planned</h2>
            <p>
              Experiments, Protocols, Planner, Files, and Analysis will be implemented in their own
              reviewed issues. No counts or records are invented here.
            </p>
          </div>
        </div>
      </Card>

      {editing ? (
        <ProjectFormDialog
          open
          project={project}
          onOpenChange={setEditing}
          onSaved={(saved) => {
            setProject(saved);
            setEditing(false);
          }}
        />
      ) : null}
      {archiving ? (
        <ArchiveProjectDialog
          open
          project={project}
          onOpenChange={setArchiving}
          onArchived={() => router.push("/experiments/projects")}
        />
      ) : null}
    </div>
  );
}
