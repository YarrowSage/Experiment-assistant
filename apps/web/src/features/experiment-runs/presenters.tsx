"use client";

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
import type { Locale, MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

import type { ExperimentRunStatus } from "./types";

const details: Record<ExperimentRunStatus, { icon: typeof Clock3; label: MessageKey; tone: BadgeTone }> = {
  draft: { icon: FilePenLine, label: "status.draft", tone: "neutral" },
  planned: { icon: Clock3, label: "status.planned", tone: "accent" },
  ready: { icon: CirclePlay, label: "status.ready", tone: "accent" },
  in_progress: { icon: CirclePlay, label: "status.inProgress", tone: "success" },
  paused: { icon: CirclePause, label: "status.paused", tone: "warning" },
  completed: { icon: CircleCheck, label: "status.completed", tone: "success" },
  cancelled: { icon: Ban, label: "status.cancelled", tone: "neutral" },
  archived: { icon: Archive, label: "status.archived", tone: "neutral" },
};

export function ExperimentRunStatusBadge({ status }: { status: ExperimentRunStatus }) {
  const { t } = useLocalization();
  const detail = details[status];
  const Icon = detail.icon;
  return (
    <Badge tone={detail.tone}>
      <Icon aria-hidden="true" size={13} />
      {t(detail.label)}
    </Badge>
  );
}

export function formatDateTime(value: string | null, locale: Locale = "en-US", empty = "Not recorded"): string {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function toLocalDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
