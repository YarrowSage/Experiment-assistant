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
import { useLocalization } from "@/locales/localization-provider";
import { presentError } from "@/locales";

import { getProject } from "./api";
import { ArchiveProjectDialog } from "./archive-project-dialog";
import { formatPlanningDate, formatUpdatedAt, ProjectStatusBadge } from "./project-presenters";
import { ProjectFormDialog } from "./project-form-dialog";
import styles from "./projects.module.css";
import type { Project } from "./types";

export function ProjectOverview({ projectId }: { projectId: string }) {
  const { locale, t } = useLocalization();
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
      setLoadError(presentError(error, t, "projects.loadError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

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
          setLoadError(presentError(error, t, "projects.loadError"));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadOverview();
    return () => {
      ignore = true;
    };
  }, [projectId, t]);

  if (loading) {
    return (
      <Card>
        <LoadingState label={t("projects.loadingOverview")} />
      </Card>
    );
  }

  if (loadError || !project) {
    return (
      <Card>
        <ErrorState
          description={loadError ?? t("projects.notFound")}
          title={t("projects.openError")}
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
                {t("common.edit")}
              </Button>
              <Button variant="secondary" onClick={() => setArchiving(true)}>
                <Archive aria-hidden="true" size={17} />
                {t("common.archive")}
              </Button>
            </div>
          )
        }
        breadcrumb={[
          { href: "/experiments/projects", label: t("projects.title") },
          { label: project.title },
        ]}
        description={t("projects.overviewDescription")}
        eyebrow={t("common.project")}
        title={project.title}
      />

      <div className={styles.overviewLayout}>
        <Card>
          <CardHeader>
            <CardTitle>{t("common.overview")}</CardTitle>
            <ProjectStatusBadge status={project.status} />
          </CardHeader>
          <CardContent className={styles.detailList}>
            <section>
              <h3>{t("common.description")}</h3>
              <p>{project.description ?? t("common.noDescription")}</p>
            </section>
            <section>
              <h3>{t("common.objective")}</h3>
              <p>{project.objective ?? t("common.noObjective")}</p>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("projects.planningDetails")}</CardTitle>
          </CardHeader>
          <CardContent className={styles.detailList}>
            <section className={styles.iconDetail}>
              <CalendarRange aria-hidden="true" size={18} />
              <div>
                <h3>{t("projects.planningRange")}</h3>
                <p>
                  {project.start_date ? formatPlanningDate(project.start_date, locale) : t("common.noStartDate")}
                  {" – "}
                  {project.end_date ? formatPlanningDate(project.end_date, locale) : t("common.openEnded")}
                </p>
              </div>
            </section>
            <section className={styles.iconDetail}>
              <Tags aria-hidden="true" size={18} />
              <div>
                <h3>{t("projects.tags")}</h3>
                {project.tags.length ? (
                  <div className={styles.tagList}>
                    {project.tags.map((tag) => (
                      <span className={styles.tag} key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>{t("projects.noTags")}</p>
                )}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("projects.record")}</CardTitle>
        </CardHeader>
        <CardContent className={styles.recordMetadata}>
          <span>
            {t("common.created", { date: formatUpdatedAt(project.created_at, locale) })}
          </span>
          <span>
            {t("common.updated", { date: formatUpdatedAt(project.updated_at, locale) })}
          </span>
          <span>{t("common.revision", { revision: project.revision })}</span>
        </CardContent>
      </Card>

      <Card>
        <div className={styles.plannedModules}>
          <FileText aria-hidden="true" size={23} />
          <div>
            <h2>{t("projects.workflows")}</h2>
            <p>{t("projects.workflowsDescription")}</p>
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
