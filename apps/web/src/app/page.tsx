import { Beaker, CalendarDays, CircleArrowRight } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/components/ui";

import styles from "./pages.module.css";

export default function HomePage() {
  return (
    <div className={styles.pageStack}>
      <PageHeader
        description="Your calm starting point for planning, running, and reviewing laboratory work."
        eyebrow="Home"
        title="Ready for today’s experiments?"
      />

      <section aria-label="Today and active work" className={styles.twoColumnGrid}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Today</CardTitle>
              <CardDescription>Planned laboratory work will appear here.</CardDescription>
            </div>
            <Badge tone="neutral">Shell</Badge>
          </CardHeader>
          <CardContent>
            <EmptyState
              description="Planner data is not implemented in P1-02. This space is ready for the reviewed planning workflow."
              icon={<CalendarDays size={23} />}
              title="No schedule data yet"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Continue experiment</CardTitle>
              <CardDescription>Active runs will keep their next step visible.</CardDescription>
            </div>
            <Badge tone="neutral">Shell</Badge>
          </CardHeader>
          <CardContent>
            <EmptyState
              description="Experiment execution belongs to a later reviewed issue, so no synthetic run is presented as a real record."
              icon={<Beaker size={23} />}
              title="No active experiment"
            />
          </CardContent>
        </Card>
      </section>

      <Card className={styles.foundationCard}>
        <div className={styles.foundationIcon} aria-hidden="true">
          <CircleArrowRight size={22} />
        </div>
        <div>
          <CardTitle>Product shell ready for real workflows</CardTitle>
          <CardDescription>
            Navigation, responsive structure, and accessible interface foundations are in place.
            Projects, experiments, and workbenches remain clearly marked as future work.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
