"use client";

import {
  Beaker,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  FlaskConical,
  Home,
  LibraryBig,
  Menu,
  Microscope,
  Plus,
  Search,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { classNames } from "@/lib/class-names";
import type { Locale, MessageKey } from "@/locales";
import { useLocalization } from "@/locales/localization-provider";

import { Button, Dialog, Drawer } from "../ui";
import styles from "./app-shell.module.css";
import {
  resolveSecondaryNavigation,
  type SecondaryNavigationConfig,
} from "./secondary-navigation";

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: MessageKey;
};

const primaryNavigation: NavigationItem[] = [
  { href: "/", icon: Home, label: "navigation.home" },
  { href: "/planner", icon: CalendarDays, label: "navigation.planner" },
  { href: "/experiments", icon: Beaker, label: "navigation.experiments" },
  { href: "/workbenches", icon: Microscope, label: "navigation.workbenches" },
  { href: "/analysis", icon: ChartNoAxesColumnIncreasing, label: "navigation.analysis" },
  { href: "/resources", icon: LibraryBig, label: "navigation.resources" },
];

const mobileNavigation = primaryNavigation.slice(0, 4);
const languageOptions: ReadonlyArray<{ label: MessageKey; locale: Locale }> = [
  { label: "settings.simplifiedChinese", locale: "zh-CN" },
  { label: "settings.english", locale: "en-US" },
];

function isRouteActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SecondaryNavigation({
  config,
  pathname,
}: {
  config: SecondaryNavigationConfig;
  pathname: string;
}) {
  const { t } = useLocalization();
  return (
    <aside
      aria-label={t("navigation.contextNavigation", { module: t(config.title) })}
      className={styles.secondary}
    >
      <div className={styles.secondaryInner}>
        <h2 className={styles.secondaryTitle}>{t(config.title)}</h2>
        <ul className={styles.secondaryList}>
          {config.items.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={classNames(
                    styles.secondaryLink,
                    pathname === item.href && styles.secondaryLinkActive,
                  )}
                  href={item.href}
                >
                  {t(item.label)}
                </Link>
              ) : (
                <span className={styles.secondaryPlaceholder}>
                  {t(item.label)}
                  <span className={styles.plannedLabel}>{t("status.plannedLabel")}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocalization();
  const [dialog, setDialog] = useState<"search" | "new" | "settings" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const secondaryConfig = resolveSecondaryNavigation(pathname);

  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDialog("search");
      }
    }

    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        {t("accessibility.skipToContent")}
      </a>
      <header className={styles.header}>
        <Link aria-label={`Experiment Assistant · ${t("navigation.home")}`} className={styles.brand} href="/">
          <span aria-hidden="true" className={styles.brandMark}>
            <FlaskConical size={20} strokeWidth={2} />
          </span>
          <span className={styles.brandText}>Experiment Assistant</span>
        </Link>

        <nav aria-label={t("accessibility.primaryNavigation")} className={styles.primaryNav}>
          <ul className={styles.primaryList}>
            {primaryNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  aria-current={isRouteActive(pathname, item.href) ? "page" : undefined}
                  className={classNames(
                    styles.primaryLink,
                    isRouteActive(pathname, item.href) && styles.primaryLinkActive,
                  )}
                  href={item.href}
                >
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.headerActions}>
          <button
            aria-label={t("accessibility.openSearch")}
            className={styles.searchButton}
            type="button"
            onClick={() => setDialog("search")}
          >
            <Search aria-hidden="true" size={18} />
            <span className={styles.searchLabel}>{t("common.search")}</span>
            <span aria-hidden="true" className={styles.shortcut}>
              Ctrl K
            </span>
          </button>
          <Button size="medium" onClick={() => setDialog("new")}>
            <Plus aria-hidden="true" size={17} />
            {t("common.new")}
          </Button>
          <button
            aria-label={t("accessibility.openSettings")}
            className={classNames(styles.iconButton, styles.settingsButton)}
            type="button"
            onClick={() => setDialog("settings")}
          >
            <UserRound aria-hidden="true" size={20} />
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {secondaryConfig ? (
          <SecondaryNavigation config={secondaryConfig} pathname={pathname} />
        ) : null}
        <main className={styles.main} id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav aria-label={t("accessibility.mobileNavigation")} className={styles.mobileNav}>
        <ul className={styles.mobileList}>
          {mobileNavigation.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={classNames(styles.mobileLink, active && styles.mobileLinkActive)}
                  href={item.href}
                >
                  <Icon aria-hidden="true" size={21} strokeWidth={2} />
                  <span>{t(item.label)}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button className={styles.mobileButton} type="button" onClick={() => setMoreOpen(true)}>
              <Menu aria-hidden="true" size={21} strokeWidth={2} />
              <span>{t("navigation.more")}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog
        description={t("search.description")}
        footer={
          <Button variant="secondary" onClick={() => setDialog(null)}>
            {t("common.close")}
          </Button>
        }
        open={dialog === "search"}
        title={t("search.title")}
        onOpenChange={(open) => setDialog(open ? "search" : null)}
      >
        <p className={styles.modalCopy}>
          {t("search.body")}
        </p>
      </Dialog>

      <Dialog
        description={t("create.description")}
        footer={
          <Button variant="secondary" onClick={() => setDialog(null)}>
            {t("common.close")}
          </Button>
        }
        open={dialog === "new"}
        title={t("create.title")}
        onOpenChange={(open) => setDialog(open ? "new" : null)}
      >
        <p className={styles.modalCopy}>
          {t("create.body")}
        </p>
        <div className={styles.modalNotice}>
          <strong>{t("create.projectAvailable")}</strong>
          <p>{t("create.projectDescription")}</p>
          <Link
            className={styles.modalActionLink}
            href="/experiments/projects"
            onClick={() => setDialog(null)}
          >
            {t("create.openProjects")}
          </Link>
        </div>
        <div className={styles.modalNotice}>
          <strong>{t("create.experimentAvailable")}</strong>
          <p>{t("create.experimentDescription")}</p>
          <Link
            className={styles.modalActionLink}
            href="/experiments/runs"
            onClick={() => setDialog(null)}
          >
            {t("create.openExperiments")}
          </Link>
        </div>
        <div className={styles.modalNotice}>
          <strong>{t("create.protocolAvailable")}</strong>
          <p>{t("create.protocolDescription")}</p>
          <Link
            className={styles.modalActionLink}
            href="/experiments/projects"
            onClick={() => setDialog(null)}
          >
            {t("common.chooseProject")}
          </Link>
        </div>
      </Dialog>

      <Dialog
        description={t("settings.description")}
        footer={
          <Button variant="secondary" onClick={() => setDialog(null)}>
            {t("common.close")}
          </Button>
        }
        open={dialog === "settings"}
        title={t("settings.title")}
        onOpenChange={(open) => setDialog(open ? "settings" : null)}
      >
        <p className={styles.modalCopy}>
          {t("settings.boundary")}
        </p>
        <fieldset className={styles.languagePicker}>
          <legend>{t("settings.language")}</legend>
          <p>{t("settings.languageDescription")}</p>
          {languageOptions.map((option) => (
            <label key={option.locale}>
              <input
                checked={locale === option.locale}
                name="interface-language"
                type="radio"
                value={option.locale}
                onChange={() => setLocale(option.locale)}
              />
              {t(option.label)}
            </label>
          ))}
        </fieldset>
      </Dialog>

      <Drawer
        description={t("navigation.settingsProfile")}
        open={moreOpen}
        position="bottom"
        title={t("navigation.more")}
        onOpenChange={setMoreOpen}
      >
        <ul className={styles.moreList}>
          {primaryNavigation.slice(4).map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={classNames(styles.moreLink, active && styles.moreLinkActive)}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                >
                  <Icon aria-hidden="true" size={20} />
                  {t(item.label)}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              className={styles.moreButton}
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setDialog("search");
              }}
            >
              <Search aria-hidden="true" size={20} />
              {t("common.search")}
            </button>
          </li>
          <li>
            <button
              className={styles.moreButton}
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setDialog("settings");
              }}
            >
              <Settings aria-hidden="true" size={20} />
              {t("navigation.settingsProfile")}
            </button>
          </li>
        </ul>
      </Drawer>
    </div>
  );
}
