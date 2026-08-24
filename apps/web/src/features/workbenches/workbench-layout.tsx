import type { ReactNode } from "react";

import { classNames } from "@/lib/class-names";

import styles from "./workbenches.module.css";

type WorkbenchLayoutProps = {
  children: ReactNode;
  className?: string;
  header: ReactNode;
  navigation?: ReactNode;
};

export function WorkbenchLayout({
  children,
  className,
  header,
  navigation,
}: WorkbenchLayoutProps) {
  return (
    <div className={classNames(styles.pageStack, className)}>
      {header}
      {navigation ? (
        <div className={styles.detailLayout}>
          {navigation}
          <div className={styles.detailContent}>{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
