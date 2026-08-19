import type { Metadata } from "next";
import { Calculator, LayoutTemplate, LibraryBig, Star } from "lucide-react";

import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui";

import styles from "../pages.module.css";

export const metadata: Metadata = { title: "Resources" };

const resources = [
  {
    description: "Focused scientific calculators with explicit inputs, units, and methods.",
    icon: Calculator,
    title: "Calculators",
  },
  {
    description: "Reusable record and workflow templates reserved for a later reviewed phase.",
    icon: LayoutTemplate,
    title: "Templates",
  },
  {
    description: "Kit identity, manufacturer details, manuals, and protocol relationships.",
    icon: LibraryBig,
    title: "Kits & Manuals",
  },
  {
    description: "A future place to return quickly to deliberately saved resources.",
    icon: Star,
    title: "Favorites",
  },
];

export default function ResourcesPage() {
  return (
    <div className={styles.pageStack}>
      <PageHeader
        breadcrumb={[{ href: "/", label: "Home" }, { label: "Resources" }]}
        description="Planned reference tools and materials will stay connected to the research records that give them meaning."
        eyebrow="Reference material"
        title="Resources"
      />
      <section aria-label="Planned resource areas" className={styles.resourceGrid}>
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <Card key={resource.title}>
              <CardHeader>
                <div className={styles.resourceHeader}>
                  <span aria-hidden="true" className={styles.resourceIcon}>
                    <Icon size={22} strokeWidth={1.8} />
                  </span>
                  <div>
                    <CardTitle>{resource.title}</CardTitle>
                    <CardDescription>Reserved product area</CardDescription>
                  </div>
                </div>
                <Badge tone="neutral">Planned</Badge>
              </CardHeader>
              <p className={styles.resourceCopy}>{resource.description}</p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
