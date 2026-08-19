import type { ReactNode } from "react";

import type { BreadcrumbItem } from "./breadcrumb";
import { Breadcrumb } from "./breadcrumb";
import styles from "./ui.module.css";

type PageHeaderProps = {
  action?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  description?: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({ action, breadcrumb, description, eyebrow, title }: PageHeaderProps) {
  return (
    <>
      {breadcrumb ? <Breadcrumb items={breadcrumb} /> : null}
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderText}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 className={styles.pageTitle}>{title}</h1>
          {description ? <p className={styles.pageDescription}>{description}</p> : null}
        </div>
        {action ? <div className={styles.pageHeaderAction}>{action}</div> : null}
      </header>
    </>
  );
}
