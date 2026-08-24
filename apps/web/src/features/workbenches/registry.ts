import {
  Activity,
  ChartNoAxesColumnIncreasing,
  Download,
  FlaskConical,
  FolderOpen,
  Grid3X3,
  History,
  Microscope,
  Paperclip,
  PawPrint,
  Play,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

import type { MessageKey } from "@/locales";

export const workbenchIds = ["animal", "cell", "plate", "chromatography"] as const;

export type WorkbenchId = (typeof workbenchIds)[number];
export type WorkbenchStatus = "available" | "planned";

export const workbenchSectionIds = [
  "overview",
  "protocol",
  "execution",
  "timeline",
  "evidence",
  "analysis",
  "files",
  "export",
] as const;

export type WorkbenchSectionId = (typeof workbenchSectionIds)[number];

export type WorkbenchDefinition = {
  availableSections: readonly WorkbenchSectionId[];
  descriptionKey: MessageKey;
  icon: LucideIcon;
  id: WorkbenchId;
  nameKey: MessageKey;
  plannedDescriptionKey: MessageKey;
  route: `/workbenches/${WorkbenchId}`;
  status: WorkbenchStatus;
};

export type WorkbenchSectionDefinition = {
  icon: LucideIcon;
  id: WorkbenchSectionId;
  labelKey: MessageKey;
};

export const workbenchRegistry: readonly WorkbenchDefinition[] = [
  {
    availableSections: [],
    descriptionKey: "workbench.animal.description",
    icon: PawPrint,
    id: "animal",
    nameKey: "workbench.animal.title",
    plannedDescriptionKey: "workbench.animal.plannedDescription",
    route: "/workbenches/animal",
    status: "planned",
  },
  {
    availableSections: [],
    descriptionKey: "workbench.cell.description",
    icon: Microscope,
    id: "cell",
    nameKey: "workbench.cell.title",
    plannedDescriptionKey: "workbench.cell.plannedDescription",
    route: "/workbenches/cell",
    status: "planned",
  },
  {
    availableSections: [],
    descriptionKey: "workbench.plate.description",
    icon: Grid3X3,
    id: "plate",
    nameKey: "workbench.plate.title",
    plannedDescriptionKey: "workbench.plate.plannedDescription",
    route: "/workbenches/plate",
    status: "planned",
  },
  {
    availableSections: [],
    descriptionKey: "workbench.chromatography.description",
    icon: Activity,
    id: "chromatography",
    nameKey: "workbench.chromatography.title",
    plannedDescriptionKey: "workbench.chromatography.plannedDescription",
    route: "/workbenches/chromatography",
    status: "planned",
  },
] as const;

export const workbenchSections: readonly WorkbenchSectionDefinition[] = [
  { icon: FlaskConical, id: "overview", labelKey: "workbench.section.overview" },
  { icon: ScrollText, id: "protocol", labelKey: "workbench.section.protocol" },
  { icon: Play, id: "execution", labelKey: "workbench.section.execution" },
  { icon: History, id: "timeline", labelKey: "workbench.section.timeline" },
  { icon: Paperclip, id: "evidence", labelKey: "workbench.section.evidence" },
  { icon: ChartNoAxesColumnIncreasing, id: "analysis", labelKey: "workbench.section.analysis" },
  { icon: FolderOpen, id: "files", labelKey: "workbench.section.files" },
  { icon: Download, id: "export", labelKey: "workbench.section.export" },
] as const;

export function getWorkbenchDefinition(id: WorkbenchId) {
  return workbenchRegistry.find((workbench) => workbench.id === id)!;
}

export function isWorkbenchId(value: string): value is WorkbenchId {
  return workbenchIds.some((id) => id === value);
}
