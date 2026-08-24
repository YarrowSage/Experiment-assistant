import type { ReactNode } from "react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui";

import styles from "./workbenches.module.css";

export type RecordCardMetadata = {
  label: string;
  value: ReactNode;
};

type RecordCardProps = {
  action?: ReactNode;
  metadata?: readonly RecordCardMetadata[];
  status?: ReactNode;
  title: string;
};

export function RecordCard({ action, metadata = [], status, title }: RecordCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {status}
      </CardHeader>
      {metadata.length > 0 ? (
        <CardContent>
          <dl className={styles.recordMetadata}>
            {metadata.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      ) : null}
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}
