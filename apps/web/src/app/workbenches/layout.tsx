import type { ReactNode } from "react";

import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("workbenches.title");

export default function WorkbenchesLayout({ children }: { children: ReactNode }) {
  return children;
}
