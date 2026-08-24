"use client";

import { AlertTriangle } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "./button";
import { useLocalization } from "@/locales/localization-provider";
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

export function LoadingState({ label }: { label?: string }) {
  const { t } = useLocalization();
  const visibleLabel = label ?? t("common.loading");
  return (
    <div aria-busy="true" aria-label={visibleLabel} className={styles.loadingState} role="status">
      <div className={styles.loadingGroup}>
        <Skeleton height={18} width="42%" />
        <Skeleton height={14} />
        <Skeleton height={14} width="76%" />
      </div>
      <span>{visibleLabel}</span>
    </div>
  );
}

export function ErrorState({
  description,
  onRetry,
  title,
}: {
  description: string;
  onRetry?: () => void;
  title?: string;
}) {
  const { t } = useLocalization();
  return (
    <div className={styles.errorState} role="alert">
      <span aria-hidden="true" className={styles.stateIcon}>
        <AlertTriangle size={23} />
      </span>
      <h3 className={styles.stateTitle}>{title ?? t("common.somethingWrong")}</h3>
      <p className={styles.stateDescription}>{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {t("common.tryAgain")}
        </Button>
      ) : null}
    </div>
  );
}
