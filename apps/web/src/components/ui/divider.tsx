import type { HTMLAttributes } from "react";

import { classNames } from "@/lib/class-names";

import styles from "./ui.module.css";

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={classNames(styles.divider, className)} {...props} />;
}
