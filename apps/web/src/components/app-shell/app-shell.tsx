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

import { Button, Dialog, Drawer } from "../ui";
import styles from "./app-shell.module.css";
import {
  resolveSecondaryNavigation,
  type SecondaryNavigationConfig,
} from "./secondary-navigation";

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const primaryNavigation: NavigationItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/planner", icon: CalendarDays, label: "Planner" },
  { href: "/experiments", icon: Beaker, label: "Experiments" },
  { href: "/workbenches", icon: Microscope, label: "Workbenches" },
  { href: "/analysis", icon: ChartNoAxesColumnIncreasing, label: "Analysis" },
  { href: "/resources", icon: LibraryBig, label: "Resources" },
];

const mobileNavigation = primaryNavigation.slice(0, 4);

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
  return (
    <aside aria-label={`${config.title} navigation`} className={styles.secondary}>
      <div className={styles.secondaryInner}>
        <h2 className={styles.secondaryTitle}>{config.title}</h2>
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
                  {item.label}
                </Link>
              ) : (
                <span className={styles.secondaryPlaceholder}>
                  {item.label}
                  <span className={styles.plannedLabel}>Planned</span>
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
        Skip to main content
      </a>
      <header className={styles.header}>
        <Link aria-label="Experiment Assistant home" className={styles.brand} href="/">
          <span aria-hidden="true" className={styles.brandMark}>
            <FlaskConical size={20} strokeWidth={2} />
          </span>
          <span className={styles.brandText}>Experiment Assistant</span>
        </Link>

        <nav aria-label="Primary navigation" className={styles.primaryNav}>
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
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.headerActions}>
          <button
            aria-label="Open search shell"
            className={styles.searchButton}
            type="button"
            onClick={() => setDialog("search")}
          >
            <Search aria-hidden="true" size={18} />
            <span className={styles.searchLabel}>Search</span>
            <span aria-hidden="true" className={styles.shortcut}>
              Ctrl K
            </span>
          </button>
          <Button size="medium" onClick={() => setDialog("new")}>
            <Plus aria-hidden="true" size={17} />
            New
          </Button>
          <button
            aria-label="Open settings and profile shell"
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

      <nav aria-label="Mobile navigation" className={styles.mobileNav}>
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
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button className={styles.mobileButton} type="button" onClick={() => setMoreOpen(true)}>
              <Menu aria-hidden="true" size={21} strokeWidth={2} />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog
        description="The global search boundary is ready; searchable records arrive in later issues."
        footer={
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Close
          </Button>
        }
        open={dialog === "search"}
        title="Search"
        onOpenChange={(open) => setDialog(open ? "search" : null)}
      >
        <p className={styles.modalCopy}>
          Search will group Projects, Protocols, Runs, resources, and files after those records are
          implemented. No placeholder results are presented as real data.
        </p>
      </Dialog>

      <Dialog
        description="Creation actions will be connected by their own reviewed product issues."
        footer={
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Close
          </Button>
        }
        open={dialog === "new"}
        title="Create new"
        onOpenChange={(open) => setDialog(open ? "new" : null)}
      >
        <p className={styles.modalCopy}>
          This is the shared action shell only. Project and experiment creation are intentionally not
          implemented in P1-02.
        </p>
        <div className={styles.modalNotice}>
          <strong>Planned capability</strong>
          <p>Creation flows will appear here only after their domain and API work is reviewed.</p>
        </div>
      </Dialog>

      <Dialog
        description="Account, workspace, and preferences are not implemented in the local-only phase."
        footer={
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Close
          </Button>
        }
        open={dialog === "settings"}
        title="Settings and profile"
        onOpenChange={(open) => setDialog(open ? "settings" : null)}
      >
        <p className={styles.modalCopy}>
          The shell reserves this location without implying that authentication, permissions, or
          synchronization already exist.
        </p>
      </Dialog>

      <Drawer
        description="Additional product areas and settings"
        open={moreOpen}
        position="bottom"
        title="More"
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
                  {item.label}
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
              Search
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
              Settings and profile
            </button>
          </li>
        </ul>
      </Drawer>
    </div>
  );
}
