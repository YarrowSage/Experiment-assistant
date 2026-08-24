"use client";

import { Archive, CircleCheck, CirclePause, CirclePlay, Clock3 } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui";
import type { Locale, MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

import type { ProjectStatus } from "./types";

const statusDetails: Record<
  ProjectStatus,
  { icon: typeof Clock3; label: MessageKey; tone: BadgeTone }
> = {
  planning: { icon: Clock3, label: "status.planning", tone: "accent" },
  active: { icon: CirclePlay, label: "status.active", tone: "success" },
  paused: { icon: CirclePause, label: "status.paused", tone: "warning" },
  completed: { icon: CircleCheck, label: "status.completed", tone: "success" },
  archived: { icon: Archive, label: "status.archived", tone: "neutral" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useLocalization();
  const detail = statusDetails[status];
  const Icon = detail.icon;
  return (
    <Badge tone={detail.tone}>
      <Icon aria-hidden="true" size={13} />
      {t(detail.label)}
    </Badge>
  );
}

export function formatPlanningDate(value: string, locale: Locale = "en-US"): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatUpdatedAt(value: string, locale: Locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
