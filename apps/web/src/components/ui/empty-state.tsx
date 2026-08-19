import type { ReactNode } from "react";

import styles from "./ui.module.css";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
};

export function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <span aria-hidden="true" className={styles.stateIcon}>
        {icon}
      </span>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
      {action}
    </div>
  );
}
