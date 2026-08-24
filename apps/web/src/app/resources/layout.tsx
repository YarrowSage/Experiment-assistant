import type { ReactNode } from "react";

import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("resources.title");

export default function ResourcesLayout({ children }: { children: ReactNode }) {
  return children;
}
