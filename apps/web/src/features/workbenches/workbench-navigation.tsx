"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Drawer } from "@/components/ui";
import { classNames } from "@/lib/class-names";
import { useLocalization } from "@/locales/localization-provider";

import {
  workbenchSections,
  type WorkbenchSectionDefinition,
  type WorkbenchSectionId,
} from "./registry";
import styles from "./workbenches.module.css";

type WorkbenchNavigationProps = {
  activeSection: WorkbenchSectionId;
  basePath: string;
};

const compactPrimarySections: readonly WorkbenchSectionId[] = ["overview", "execution"];

function sectionHref(basePath: string, section: WorkbenchSectionId) {
  return `${basePath}/${section}`;
}

function NavigationLink({
  activeSection,
  basePath,
  section,
  onNavigate,
}: {
  activeSection: WorkbenchSectionId;
  basePath: string;
  onNavigate?: () => void;
  section: WorkbenchSectionDefinition;
}) {
  const { t } = useLocalization();
  const Icon = section.icon;
  const active = activeSection === section.id;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={classNames(styles.navigationLink, active && styles.navigationLinkActive)}
      href={sectionHref(basePath, section.id)}
      onClick={onNavigate}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
      <span>{t(section.labelKey)}</span>
    </Link>
  );
}

function NavigationItems({
  activeSection,
  basePath,
  sections = workbenchSections,
}: WorkbenchNavigationProps & { sections?: readonly WorkbenchSectionDefinition[] }) {
  return (
    <ul className={styles.navigationList}>
      {sections.map((section) => (
        <li key={section.id}>
          <NavigationLink
            activeSection={activeSection}
            basePath={basePath}
            section={section}
          />
        </li>
      ))}
    </ul>
  );
}

export function WorkbenchNavigation({ activeSection, basePath }: WorkbenchNavigationProps) {
  const { t } = useLocalization();
  const [moreOpen, setMoreOpen] = useState(false);
  const compactSections = workbenchSections.filter((section) =>
    compactPrimarySections.includes(section.id),
  );
  const moreSections = workbenchSections.filter(
    (section) => !compactPrimarySections.includes(section.id),
  );

  return (
    <>
      <aside
        aria-label={t("workbench.navigation.desktop")}
        className={styles.navigationDesktop}
      >
        <NavigationItems activeSection={activeSection} basePath={basePath} />
      </aside>

      <nav
        aria-label={t("workbench.navigation.tablet")}
        className={styles.navigationTablet}
      >
        <NavigationItems activeSection={activeSection} basePath={basePath} />
      </nav>

      <nav
        aria-label={t("workbench.navigation.mobile")}
        className={styles.navigationMobile}
      >
        <NavigationItems
          activeSection={activeSection}
          basePath={basePath}
          sections={compactSections}
        />
        <button
          aria-expanded={moreOpen}
          className={styles.navigationMoreButton}
          type="button"
          onClick={() => setMoreOpen(true)}
        >
          <Menu aria-hidden="true" size={18} strokeWidth={1.9} />
          {t("navigation.more")}
        </button>
      </nav>

      <Drawer
        description={t("workbench.navigation.moreDescription")}
        open={moreOpen}
        position="bottom"
        title={t("workbench.navigation.moreTitle")}
        onOpenChange={setMoreOpen}
      >
        <ul className={styles.navigationDrawerList}>
          {moreSections.map((section) => (
            <li key={section.id}>
              <NavigationLink
                activeSection={activeSection}
                basePath={basePath}
                section={section}
                onNavigate={() => setMoreOpen(false)}
              />
            </li>
          ))}
        </ul>
      </Drawer>
    </>
  );
}

export { sectionHref as getWorkbenchSectionHref };
