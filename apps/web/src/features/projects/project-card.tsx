import { Archive, ArrowRight, CalendarRange, Pencil, Tags } from "lucide-react";
import Link from "next/link";

import { Button, Card } from "@/components/ui";

import { formatPlanningDate, formatUpdatedAt, ProjectStatusBadge } from "./project-presenters";
import styles from "./projects.module.css";
import type { Project } from "./types";

export function ProjectCard({
  onArchive,
  onEdit,
  project,
}: {
  onArchive: (project: Project) => void;
  onEdit: (project: Project) => void;
  project: Project;
}) {
  const summary = project.description ?? project.objective;
  return (
    <Card className={styles.projectCard}>
      <div className={styles.projectCardHeader}>
        <div>
          <Link className={styles.projectTitleLink} href={`/experiments/projects/${project.id}`}>
            <h2>{project.title}</h2>
          </Link>
          <p className={styles.projectSummary}>{summary ?? "No description or objective recorded."}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <div className={styles.projectMetadata}>
        {project.start_date || project.end_date ? (
          <span>
            <CalendarRange aria-hidden="true" size={16} />
            {project.start_date ? formatPlanningDate(project.start_date) : "No start date"}
            {" – "}
            {project.end_date ? formatPlanningDate(project.end_date) : "Open ended"}
          </span>
        ) : null}
        {project.tags.length ? (
          <span>
            <Tags aria-hidden="true" size={16} />
            <span className={styles.tagList}>
              {project.tags.map((tag) => (
                <span className={styles.tag} key={tag}>
                  {tag}
                </span>
              ))}
            </span>
          </span>
        ) : null}
      </div>

      <div className={styles.projectCardFooter}>
        <p>
          Updated <time dateTime={project.updated_at}>{formatUpdatedAt(project.updated_at)}</time>
        </p>
        <div className={styles.cardActions}>
          {project.status !== "archived" ? (
            <>
              <Button size="small" variant="ghost" onClick={() => onEdit(project)}>
                <Pencil aria-hidden="true" size={16} />
                Edit
              </Button>
              <Button size="small" variant="ghost" onClick={() => onArchive(project)}>
                <Archive aria-hidden="true" size={16} />
                Archive
              </Button>
            </>
          ) : null}
          <Link className={styles.openProjectLink} href={`/experiments/projects/${project.id}`}>
            Open project
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </Card>
  );
}
