import {
  Archive,
  Ban,
  CircleCheck,
  CirclePause,
  CirclePlay,
  Clock3,
  FilePenLine,
} from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui";

import type { ExperimentRunStatus } from "./types";

const details: Record<ExperimentRunStatus, { icon: typeof Clock3; label: string; tone: BadgeTone }> = {
  draft: { icon: FilePenLine, label: "Draft", tone: "neutral" },
  planned: { icon: Clock3, label: "Planned", tone: "accent" },
  ready: { icon: CirclePlay, label: "Ready", tone: "accent" },
  in_progress: { icon: CirclePlay, label: "In progress", tone: "success" },
  paused: { icon: CirclePause, label: "Paused", tone: "warning" },
  completed: { icon: CircleCheck, label: "Completed", tone: "success" },
  cancelled: { icon: Ban, label: "Cancelled", tone: "neutral" },
  archived: { icon: Archive, label: "Archived", tone: "neutral" },
};

export function ExperimentRunStatusBadge({ status }: { status: ExperimentRunStatus }) {
  const detail = details[status];
  const Icon = detail.icon;
  return (
    <Badge tone={detail.tone}>
      <Icon aria-hidden="true" size={13} />
      {detail.label}
    </Badge>
  );
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function toLocalDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
