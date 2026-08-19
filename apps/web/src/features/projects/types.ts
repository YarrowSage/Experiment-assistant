export const projectStatuses = [
  "planning",
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export type Project = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  objective: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  revision: number;
};

export type ProjectWriteInput = {
  title: string;
  description: string | null;
  objective: string | null;
  status: Exclude<ProjectStatus, "archived">;
  start_date: string | null;
  end_date: string | null;
  tags: string[];
};

export type ProjectListResponse = {
  items: Project[];
  total: number;
  limit: number;
  offset: number;
};
