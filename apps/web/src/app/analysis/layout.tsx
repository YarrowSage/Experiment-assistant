import type { ReactNode } from "react";

import { createLocalizedMetadata } from "@/locales/metadata";

export const metadata = createLocalizedMetadata("analysis.title");

export default function AnalysisLayout({ children }: { children: ReactNode }) {
  return children;
}
