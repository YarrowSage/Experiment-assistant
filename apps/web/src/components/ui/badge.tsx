import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { classNames } from "@/lib/class-names";

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

const statusDetails: Record<Status, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  draft: { label: "Draft", tone: "neutral", icon: CircleDashed },
  planned: { label: "Planned", tone: "accent", icon: Clock3 },
  "in-progress": { label: "In progress", tone: "warning", icon: Clock3 },
  completed: { label: "Completed", tone: "success", icon: CircleCheck },
  error: { label: "Action required", tone: "danger", icon: CircleAlert },
};

export function StatusBadge({ status }: { status: Status }) {
  const detail = statusDetails[status];
  const Icon = detail.icon;

  return (
    <Badge tone={detail.tone}>
      <Icon aria-hidden="true" size={13} strokeWidth={2} />
      {detail.label}
    </Badge>
  );
}
