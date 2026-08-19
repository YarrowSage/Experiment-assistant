import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExperimentRun } from "@/features/experiment-runs/types";

import { PlannerPage } from "./planner-page";

const mocks = vi.hoisted(() => ({ listExperimentRuns: vi.fn(), listProjects: vi.fn() }));
vi.mock("@/features/experiment-runs/api", () => ({ listExperimentRuns: mocks.listExperimentRuns }));
vi.mock("@/features/projects/api", () => ({ listProjects: mocks.listProjects }));

const run: ExperimentRun = {
  id: "11111111-1111-4111-8111-111111111111",
  project_id: "22222222-2222-4222-8222-222222222222",
  protocol_version_id: null,
  title: "Planned assay",
  description: null,
  purpose: "Measure viability",
  status: "planned",
  planned_start_at: "2026-08-20T09:00:00Z",
  planned_end_at: null,
  actual_start_at: null,
  actual_end_at: null,
  completed_at: null,
  completion_note: null,
  created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T08:00:00Z",
  revision: 1,
};

describe("PlannerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listProjects.mockResolvedValue({ items: [{ id: run.project_id, title: "Real Project" }], total: 1, limit: 50, offset: 0 });
  });

  it("shows a polished empty state without inventing schedule data", async () => {
    mocks.listExperimentRuns.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    render(<PlannerPage />);
    expect(await screen.findByText("Nothing planned for today")).toBeInTheDocument();
    expect(screen.getByText(/Dependencies, automatic shifting, advanced rescheduling/i)).toBeInTheDocument();
    expect(screen.queryByText(/sample task/i)).not.toBeInTheDocument();
  });

  it("renders a real planned ExperimentRun and Project name", async () => {
    mocks.listExperimentRuns.mockResolvedValue({ items: [run], total: 1, limit: 50, offset: 0 });
    render(<PlannerPage />);
    const activePanel = await screen.findByRole("tabpanel");
    expect(within(activePanel).getByText("Planned assay")).toBeInTheDocument();
    expect(within(activePanel).getByText("Real Project")).toBeInTheDocument();
    expect(within(activePanel).getByRole("link", { name: "Open Experiment" })).toHaveAttribute("href", `/experiments/runs/${run.id}`);
  });
});
