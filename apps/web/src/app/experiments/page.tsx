import type { Metadata } from "next";
import { Beaker } from "lucide-react";

import { Card, EmptyState, PageHeader } from "@/components/ui";

import styles from "../pages.module.css";

export const metadata: Metadata = { title: "Experiments" };

export default function ExperimentsPage() {
  return (
    <div className={styles.pageStack}>
      <PageHeader
        breadcrumb={[{ href: "/", label: "Home" }, { label: "Experiments" }]}
        description="The future entry point for projects, immutable protocols, and real experiment runs."
        eyebrow="Research records"
        title="Experiments"
      />
      <Card>
        <EmptyState
          description="Project, Protocol, and ExperimentRun records are deliberately not implemented in P1-02. The shell is ready for their reviewed domain work."
          icon={<Beaker size={23} />}
          title="Experiment records come next"
        />
      </Card>
    </div>
  );
}
