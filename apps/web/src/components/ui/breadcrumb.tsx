"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { useLocalization } from "@/locales/localization-provider";

import styles from "./ui.module.css";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const { t } = useLocalization();
  return (
    <nav aria-label={t("accessibility.breadcrumb")} className={styles.breadcrumb}>
      <ol className={styles.breadcrumbList}>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li className={styles.breadcrumbItem} key={`${item.label}-${index}`}>
              {index > 0 ? (
                <span aria-hidden="true" className={styles.breadcrumbSeparator}>
                  <ChevronRight size={14} />
                </span>
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
