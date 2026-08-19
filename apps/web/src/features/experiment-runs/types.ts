export const experimentRunStatuses = [
  "draft",
  "planned",
  "ready",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
  "archived",
] as const;

export type ExperimentRunStatus = (typeof experimentRunStatuses)[number];

export type ExperimentRun = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  purpose: string | null;
  status: ExperimentRunStatus;
  planned_start_at: string | null;
  planned_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  completed_at: string | null;
  completion_note: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
};

export type ExperimentRunWriteInput = {
  project_id: string;
  title: string;
  description: string | null;
  purpose: string | null;
  status: "draft" | "planned" | "ready" | "cancelled";
  planned_start_at: string | null;
  planned_end_at: string | null;
};

export type ExperimentRunListResponse = {
  items: ExperimentRun[];
  total: number;
  limit: number;
  offset: number;
};

