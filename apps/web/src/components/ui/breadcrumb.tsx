import { ChevronRight } from "lucide-react";
import Link from "next/link";

import styles from "./ui.module.css";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <ol className={styles.breadcrumbList}>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {index > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className={styles.breadcrumbSeparator}
                  size={14}
                />
              ) : null}
              {item.href && !isCurrent ? (
                <Link className={styles.breadcrumbLink} href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined} className={styles.breadcrumbCurrent}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
