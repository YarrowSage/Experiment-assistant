import { AlertTriangle } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "./button";
import styles from "./ui.module.css";

export function Skeleton({ height, width = "100%" }: { height?: number; width?: string }) {
  return (
    <span
      aria-hidden="true"
      className={styles.skeleton}
      style={{ height, width } as CSSProperties}
    />
  );
}

export function LoadingState({ label = "Loading content" }: { label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} className={styles.loadingState} role="status">
      <div className={styles.loadingGroup}>
        <Skeleton height={18} width="42%" />
        <Skeleton height={14} />
        <Skeleton height={14} width="76%" />
      </div>
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  description,
  onRetry,
  title = "Something went wrong",
}: {
  description: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className={styles.errorState} role="alert">
      <span aria-hidden="true" className={styles.stateIcon}>
        <AlertTriangle size={23} />
      </span>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
