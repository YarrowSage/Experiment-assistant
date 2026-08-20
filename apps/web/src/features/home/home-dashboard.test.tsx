import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActivityEvent } from "@/features/evidence/types";
import type { ExperimentRun } from "@/features/experiment-runs/types";
import type { Project } from "@/features/projects/types";

import { HomeDashboard } from "./home-dashboard";

const mocks = vi.hoisted(() => ({
  listExperimentRuns: vi.fn(),
  listProjects: vi.fn(),
  listProtocols: vi.fn(),
  listRecentActivity: vi.fn(),
}));
vi.mock("@/features/experiment-runs/api", () => ({ listExperimentRuns: mocks.listExperimentRuns }));
vi.mock("@/features/projects/api", () => ({ listProjects: mocks.listProjects }));
vi.mock("@/features/protocols/api", () => ({ listProtocols: mocks.listProtocols }));
vi.mock("@/features/evidence/api", () => ({ listRecentActivity: mocks.listRecentActivity }));

const run: ExperimentRun = {
  id: "11111111-1111-4111-8111-111111111111",
  project_id: "22222222-2222-4222-8222-222222222222",
  protocol_version_id: null,
  title: "Live assay",
  description: "Real execution data",
  purpose: null,
  status: "in_progress",
  planned_start_at: "2026-08-19T09:00:00Z",
  planned_end_at: null,
  actual_start_at: "2026-08-19T09:05:00Z",
  actual_end_at: null,
  completed_at: null,
  completion_note: null,
  created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T09:05:00Z",
  revision: 2,
};
const project: Project = {
  id: run.project_id,
  workspace_id: "33333333-3333-4333-8333-333333333333",
  title: "Tumor study",
  description: "Real Project description",
  objective: null,
  status: "active",
  start_date: "2026-08-01",
  end_date: null,
  tags: ["assay"],
  created_at: "2026-08-01T08:00:00Z",
  updated_at: "2026-08-19T08:00:00Z",
  revision: 1,
};
const activity: ActivityEvent = {
  id: "44444444-4444-4444-8444-444444444444",
  workspace_id: project.workspace_id,
  project_id: project.id,
  protocol_id: null,
  experiment_run_id: run.id,
  run_step_record_id: null,
  note_id: null,
  attachment_id: null,
  event_type: "RUN_STARTED",
  message: "Experiment started.",
  actor_id: null,
  created_at: "2026-08-19T09:05:00Z",
};

describe("HomeDashboard", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("keeps Running Now entirely hidden when no Experiment is running", async () => {
    mocks.listExperimentRuns.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    mocks.listProjects.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    mocks.listProtocols.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    mocks.listRecentActivity.mockResolvedValue([]);
    render(<HomeDashboard />);
    expect(await screen.findByRole("heading", { name: "Ready for today’s experiments?" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Running Now" })).not.toBeInTheDocument();
    expect(screen.queryByText(/0 running/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current Projects" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quick Actions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent" })).toBeInTheDocument();
  });

  it("renders only real run, Project, and Activity API records", async () => {
    mocks.listExperimentRuns.mockImplementation((filters: { status?: string; plannedFrom?: string }) => {
      if (filters.status === "in_progress" || filters.plannedFrom) return Promise.resolve({ items: [run], total: 1, limit: 50, offset: 0 });
      return Promise.resolve({ items: [], total: 0, limit: 50, offset: 0 });
    });
    mocks.listProjects.mockResolvedValue({ items: [project], total: 1, limit: 50, offset: 0 });
    mocks.listProtocols.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    mocks.listRecentActivity.mockResolvedValue([activity]);
    render(<HomeDashboard />);
    expect(await screen.findByRole("heading", { name: "Running Now" })).toBeInTheDocument();
    expect(screen.getAllByText("Live assay").length).toBeGreaterThan(0);
    expect(screen.getByText("Tumor study")).toBeInTheDocument();
    expect(screen.getByText("Experiment started.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Project/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Experiment/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Protocol/ })).toBeInTheDocument();
    expect(screen.queryByText(/next task/i)).not.toBeInTheDocument();
  });
});
