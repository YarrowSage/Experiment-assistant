import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExperimentRun } from "@/features/experiment-runs/types";
import type { RunExecution } from "@/features/execution/types";

import { AmendmentPanel } from "./amendment-panel";

const mocks = vi.hoisted(() => ({ createAmendment: vi.fn(), listAmendments: vi.fn() }));
vi.mock("./api", () => mocks);

const run: ExperimentRun = {
  id: "11111111-1111-4111-8111-111111111111",
  project_id: "22222222-2222-4222-8222-222222222222",
  protocol_version_id: null,
  title: "Original title",
  description: null,
  purpose: "Original purpose",
  status: "completed",
  planned_start_at: null,
  planned_end_at: null,
  actual_start_at: "2026-08-19T09:00:00Z",
  actual_end_at: "2026-08-19T10:00:00Z",
  completed_at: "2026-08-19T10:00:00Z",
  completion_note: null,
  created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T10:00:00Z",
  revision: 4,
};
const execution: RunExecution = { run, steps: [] };
const amendment = {
  id: "33333333-3333-4333-8333-333333333333",
  experiment_run_id: run.id,
  target_type: "experiment_run" as const,
  target_id: run.id,
  target_field: "title",
  original_value: "Original title",
  corrected_value: "Corrected title",
  reason: "Data entry error",
  prior_revision: 4,
  resulting_revision: 5,
  created_by: null,
  created_at: "2026-08-19T10:15:00Z",
};

describe("AmendmentPanel", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("shows explicit original, corrected, reason, and time history", async () => {
    mocks.listAmendments.mockResolvedValue([amendment]);
    render(<AmendmentPanel execution={execution} onExecutionChanged={vi.fn()} />);
    expect(await screen.findByText("Original title")).toBeInTheDocument();
    expect(screen.getByText("Corrected title")).toBeInTheDocument();
    expect(screen.getByText("Data entry error")).toBeInTheDocument();
    expect(screen.getAllByText("Original").length).toBeGreaterThan(0);
    expect(screen.getByText("Corrected")).toBeInTheDocument();
    expect(screen.getByText("Reason")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText(/not a claim of GLP, GxP, or regulatory compliance/i)).toBeInTheDocument();
  });

  it("reviews before confirming a correction", async () => {
    const user = userEvent.setup();
    const updated = { ...execution, run: { ...run, title: "Corrected title", revision: 5 } };
    mocks.listAmendments.mockResolvedValue([]);
    mocks.createAmendment.mockResolvedValue({ amendment, execution: updated, activity: {} });
    const onExecutionChanged = vi.fn();
    render(<AmendmentPanel execution={execution} onExecutionChanged={onExecutionChanged} />);
    await screen.findByText("No amendments");
    await user.click(screen.getByRole("button", { name: "Amend record" }));
    await user.type(screen.getByLabelText("Corrected value *"), "Corrected title");
    await user.type(screen.getByLabelText("Correction reason *"), "Data entry error");
    await user.click(screen.getByRole("button", { name: "Review correction" }));
    expect(screen.getByRole("heading", { name: "Review amendment" })).toBeInTheDocument();
    expect(screen.getByText("Original title")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm amendment" }));
    await waitFor(() => expect(mocks.createAmendment).toHaveBeenCalledWith(run.id, expect.objectContaining({ expected_target_revision: 4, reason: "Data entry error" })));
    expect(onExecutionChanged).toHaveBeenCalledWith(updated);
  });
});
