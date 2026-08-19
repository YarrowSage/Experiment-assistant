import type { HTMLAttributes } from "react";

import { classNames } from "@/lib/class-names";

import styles from "./ui.module.css";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={classNames(styles.card, styles.cardPadded, className)} {...props} />;
}

export function SubtleCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={classNames(styles.card, styles.cardPadded, styles.cardSubtle, className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames(styles.cardHeader, className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={classNames(styles.cardTitle, className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={classNames(styles.cardDescription, className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames(styles.cardContent, className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames(styles.cardFooter, className)} {...props} />;
}
