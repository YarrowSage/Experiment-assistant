import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { Card, EmptyState, PageHeader, Tabs } from "@/components/ui";

import styles from "../pages.module.css";

export const metadata: Metadata = { title: "Planner" };

function PlannerEmptyState({ view }: { view: string }) {
  return (
    <Card>
      <EmptyState
        description={`${view} is a presentation shell only. Scheduling records and dependency logic are outside P1-02.`}
        icon={<CalendarDays size={23} />}
        title={`No ${view.toLowerCase()} data yet`}
      />
    </Card>
  );
}

export default function PlannerPage() {
  return (
    <div className={styles.pageStack}>
      <PageHeader
        breadcrumb={[{ href: "/", label: "Home" }, { label: "Planner" }]}
        description="A responsive home for Today, upcoming work, and calendar planning."
        eyebrow="Planning"
        title="Planner"
      />
      <Tabs
        ariaLabel="Planner views"
        defaultValue="today"
        items={[
          { content: <PlannerEmptyState view="Today" />, label: "Today", value: "today" },
          {
            content: <PlannerEmptyState view="Upcoming" />,
            label: "Upcoming",
            value: "upcoming",
          },
          {
            content: <PlannerEmptyState view="Calendar" />,
            label: "Calendar",
            value: "calendar",
          },
        ]}
      />
    </div>
  );
}
