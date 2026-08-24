"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui";
import type { MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

import styles from "./workbenches.module.css";

type WorkbenchSectionProps = {
  children: ReactNode;
  descriptionKey?: MessageKey;
  titleKey: MessageKey;
};

export function WorkbenchSection({
  children,
  descriptionKey,
  titleKey,
}: WorkbenchSectionProps) {
  const { t } = useLocalization();

  return (
    <Card className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <h2>{t(titleKey)}</h2>
        {descriptionKey ? <p>{t(descriptionKey)}</p> : null}
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </Card>
  );
}
