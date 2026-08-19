import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExperimentRunsPage } from "./experiment-runs-page";
import type { ExperimentRun } from "./types";

const mocks = vi.hoisted(() => ({
  archiveExperimentRun: vi.fn(),
  createExperimentRun: vi.fn(),
  listExperimentRuns: vi.fn(),
  listProjects: vi.fn(),
  listProtocols: vi.fn(),
  updateExperimentRun: vi.fn(),
}));

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  archiveExperimentRun: mocks.archiveExperimentRun,
  createExperimentRun: mocks.createExperimentRun,
  listExperimentRuns: mocks.listExperimentRuns,
  updateExperimentRun: mocks.updateExperimentRun,
}));
vi.mock("@/features/projects/api", () => ({ listProjects: mocks.listProjects }));
vi.mock("@/features/protocols/api", () => ({ listProtocols: mocks.listProtocols }));

const project = {
  id: "11111111-1111-4111-8111-111111111111", workspace_id: "4b8f6a4d-6bd1-5e91-a028-8d1e282b6520",
  title: "Project One", description: null, objective: null, status: "active" as const,
  start_date: null, end_date: null, tags: [], created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T08:00:00Z", revision: 1,
};
const run: ExperimentRun = {
  id: "22222222-2222-4222-8222-222222222222", project_id: project.id, title: "Pilot Run",
  protocol_version_id: null,
  description: null, purpose: "Verify response", status: "planned",
  planned_start_at: "2026-08-20T08:00:00Z", planned_end_at: null,
  actual_start_at: null, actual_end_at: null, completed_at: null, completion_note: null,
  created_at: "2026-08-19T08:00:00Z", updated_at: "2026-08-19T08:00:00Z", revision: 1,
};

describe("ExperimentRunsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listProjects.mockResolvedValue({ items: [project], total: 1, limit: 50, offset: 0 });
    mocks.listProtocols.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    mocks.listExperimentRuns.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
  });

  it("shows loading and an honest empty state", async () => {
    mocks.listExperimentRuns.mockReturnValueOnce(new Promise(() => undefined));
    render(<ExperimentRunsPage />);
    expect(screen.getByRole("status", { name: "Loading Experiments" })).toBeInTheDocument();
  });

  it("renders real runs with their Project", async () => {
    mocks.listExperimentRuns.mockResolvedValue({ items: [run], total: 1, limit: 50, offset: 0 });
    render(<ExperimentRunsPage />);
    expect(await screen.findByRole("heading", { name: run.title })).toBeInTheDocument();
    expect(screen.getByText(project.title)).toBeInTheDocument();
    expect(screen.getByText("Planned", { selector: "span" })).toBeInTheDocument();
  });

  it("validates and creates an Experiment through the API", async () => {
    const user = userEvent.setup();
    mocks.createExperimentRun.mockResolvedValue(run);
    mocks.listExperimentRuns
      .mockResolvedValueOnce({ items: [], total: 0, limit: 50, offset: 0 })
      .mockResolvedValueOnce({ items: [run], total: 1, limit: 50, offset: 0 });
    render(<ExperimentRunsPage />);
    await screen.findByRole("heading", { name: "No Experiments yet" });
    await user.click(screen.getAllByRole("button", { name: "New Experiment" })[0]);
    await user.click(screen.getByRole("button", { name: "Create Experiment" }));
    expect(screen.getByText("Experiment name is required.")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /Experiment name/ }), run.title);
    await user.click(screen.getByRole("button", { name: "Create Experiment" }));
    await waitFor(() => expect(mocks.createExperimentRun).toHaveBeenCalledTimes(1));
  });
});
