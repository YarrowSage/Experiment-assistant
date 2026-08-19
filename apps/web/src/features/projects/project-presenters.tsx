import { Archive, CircleCheck, CirclePause, CirclePlay, Clock3 } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui";

import type { ProjectStatus } from "./types";

const statusDetails: Record<
  ProjectStatus,
  { icon: typeof Clock3; label: string; tone: BadgeTone }
> = {
  planning: { icon: Clock3, label: "Planning", tone: "accent" },
  active: { icon: CirclePlay, label: "Active", tone: "success" },
  paused: { icon: CirclePause, label: "Paused", tone: "warning" },
  completed: { icon: CircleCheck, label: "Completed", tone: "success" },
  archived: { icon: Archive, label: "Archived", tone: "neutral" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const detail = statusDetails[status];
  const Icon = detail.icon;
  return (
    <Badge tone={detail.tone}>
      <Icon aria-hidden="true" size={13} />
      {detail.label}
    </Badge>
  );
}

export function formatPlanningDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
