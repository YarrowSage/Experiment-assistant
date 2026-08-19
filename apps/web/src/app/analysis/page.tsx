import type { Metadata } from "next";
import { ChartNoAxesColumnIncreasing } from "lucide-react";

import { Card, EmptyState, PageHeader } from "@/components/ui";

import styles from "../pages.module.css";

export const metadata: Metadata = { title: "Analysis" };

export default function AnalysisPage() {
  return (
    <div className={styles.pageStack}>
      <PageHeader
        breadcrumb={[{ href: "/", label: "Home" }, { label: "Analysis" }]}
        description="A reserved workspace for explicit, user-controlled scientific analysis."
        eyebrow="Review and interpret"
        title="Analysis"
      />
      <Card>
        <EmptyState
          description="Data sources, variable roles, methods, charts, and exports remain unimplemented until their dedicated issues. No analytical choice is inferred here."
          icon={<ChartNoAxesColumnIncreasing size={23} />}
          title="Analysis tools are planned"
        />
      </Card>
    </div>
  );
}
