"use client";

import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { classNames } from "@/lib/class-names";
import type { MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

import styles from "./ui.module.css";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: styles.badgeNeutral,
  accent: styles.badgeAccent,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={classNames(styles.badge, toneClasses[tone], className)} {...props} />;
}

type Status = "draft" | "planned" | "in-progress" | "completed" | "error";

const statusDetails: Record<Status, { label: MessageKey; tone: BadgeTone; icon: LucideIcon }> = {
  draft: { label: "status.draft", tone: "neutral", icon: CircleDashed },
  planned: { label: "status.planned", tone: "accent", icon: Clock3 },
  "in-progress": { label: "status.inProgress", tone: "warning", icon: Clock3 },
  completed: { label: "status.completed", tone: "success", icon: CircleCheck },
  error: { label: "status.actionRequired", tone: "danger", icon: CircleAlert },
};

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useLocalization();
  const detail = statusDetails[status];
  const Icon = detail.icon;

  return (
    <Badge tone={detail.tone}>
      <Icon aria-hidden="true" size={13} strokeWidth={2} />
      {t(detail.label)}
    </Badge>
  );
}
