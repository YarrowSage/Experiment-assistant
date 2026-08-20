import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExperimentRun } from "@/features/experiment-runs/types";

import { ExecutionPanel } from "./execution-panel";
import type { RunExecution, RunStepRecord } from "./types";

const mocks = vi.hoisted(() => ({
  completeRunStep: vi.fn(),
  getRunExecution: vi.fn(),
  pauseRunExecution: vi.fn(),
  resumeRunExecution: vi.fn(),
  startRunExecution: vi.fn(),
  startRunStep: vi.fn(),
}));
const amendmentMocks = vi.hoisted(() => ({
  completeExperiment: vi.fn(),
  createAmendment: vi.fn(),
  listAmendments: vi.fn(),
}));

vi.mock("./api", () => mocks);
vi.mock("@/features/amendments/api", () => amendmentMocks);
vi.mock("@/features/evidence/evidence-panel", () => ({
  EvidencePanel: ({ readOnly }: { readOnly?: boolean }) => <div>Evidence panel{readOnly ? " read-only" : ""}</div>,
}));

const run: ExperimentRun = {
  id: "11111111-1111-4111-8111-111111111111",
  project_id: "22222222-2222-4222-8222-222222222222",
  protocol_version_id: "33333333-3333-4333-8333-333333333333",
  title: "Execution Run",
  description: null,
  purpose: null,
  status: "ready",
  planned_start_at: "2026-08-20T08:00:00Z",
  planned_end_at: null,
  actual_start_at: null,
  actual_end_at: null,
  completed_at: null,
  completion_note: null,
  created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T08:00:00Z",
  revision: 1,
};

const step: RunStepRecord = {
  id: "44444444-4444-4444-8444-444444444444",
  experiment_run_id: run.id,
  source_protocol_version_id: run.protocol_version_id!,
  source_protocol_step_id: "55555555-5555-4555-8555-555555555555",
  source_stable_key: "66666666-6666-4666-8666-666666666666",
  position: 1,
  title_snapshot: "Incubate",
  instruction_snapshot: "Incubate for 60 seconds.",
  planned_duration_seconds_snapshot: 60,
  timer_mode_snapshot: "countdown",
  required_snapshot: true,
  precautions_snapshot: null,
  status: "pending",
  actual_start_at: null,
  actual_end_at: null,
  completed_at: null,
  duration_seconds: null,
  created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T08:00:00Z",
  revision: 1,
  substeps: [],
};

describe("ExecutionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    amendmentMocks.listAmendments.mockResolvedValue([]);
  });

  it("starts a ready Experiment through the persisted execution API", async () => {
    const user = userEvent.setup();
    const readyExecution: RunExecution = { run, steps: [] };
    const started: RunExecution = {
      run: { ...run, status: "in_progress", actual_start_at: "2026-08-19T09:00:00Z", revision: 2 },
      steps: [step],
    };
    mocks.getRunExecution.mockResolvedValue(readyExecution);
    mocks.startRunExecution.mockResolvedValue(started);
    const onRunChanged = vi.fn();
    render(<ExecutionPanel run={run} onRunChanged={onRunChanged} />);
    await user.click(await screen.findByRole("button", { name: "Start Experiment" }));
    await waitFor(() => expect(mocks.startRunExecution).toHaveBeenCalledWith(run.id, 1));
    expect(onRunChanged).toHaveBeenCalledWith(started.run);
    expect(await screen.findByRole("heading", { name: "Experiment in progress" })).toBeInTheDocument();
  });

  it("requires a published Protocol Version before offering Start", async () => {
    const protocolFree = { ...run, protocol_version_id: null, status: "planned" as const };
    mocks.getRunExecution.mockResolvedValue({ run: protocolFree, steps: [] });
    render(<ExecutionPanel run={protocolFree} onRunChanged={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Protocol required" })).toBeInTheDocument();
    expect(screen.getByText("Assign an exact published Protocol Version before starting this Experiment in Phase 1.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Experiment" })).not.toBeInTheDocument();
    expect(mocks.startRunExecution).not.toHaveBeenCalled();
  });

  it("offers Start after a published Protocol Version is assigned", async () => {
    const protocolFree = { ...run, protocol_version_id: null, status: "planned" as const };
    const assigned = { ...protocolFree, protocol_version_id: run.protocol_version_id, revision: 2 };
    mocks.getRunExecution.mockResolvedValueOnce({ run: protocolFree, steps: [] });
    const view = render(<ExecutionPanel run={protocolFree} onRunChanged={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Protocol required" })).toBeInTheDocument();

    mocks.getRunExecution.mockResolvedValue({ run: assigned, steps: [] });
    view.rerender(<ExecutionPanel run={assigned} onRunChanged={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Start Experiment" })).toBeInTheDocument();
  });

  it("reconstructs an active countdown from its persisted start timestamp without auto-completing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-19T09:00:30Z"));
    const active: RunExecution = {
      run: { ...run, status: "in_progress", actual_start_at: "2026-08-19T09:00:00Z", revision: 3 },
      steps: [{ ...step, status: "active", actual_start_at: "2026-08-19T09:00:00Z", revision: 2 }],
    };
    mocks.getRunExecution.mockResolvedValue(active);
    render(<ExecutionPanel run={active.run} onRunChanged={vi.fn()} />);
    expect(await screen.findByText("00:00:30")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete Step" })).toBeEnabled();
    expect(mocks.completeRunStep).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("requires acknowledgement before completing with a required step unfinished", async () => {
    const user = userEvent.setup();
    const inProgress: RunExecution = {
      run: { ...run, status: "in_progress", actual_start_at: "2026-08-19T09:00:00Z", revision: 3 },
      steps: [step],
    };
    const completed: RunExecution = {
      run: { ...inProgress.run, status: "completed", actual_end_at: "2026-08-19T10:00:00Z", completed_at: "2026-08-19T10:00:00Z", revision: 4 },
      steps: [step],
    };
    mocks.getRunExecution.mockResolvedValue(inProgress);
    amendmentMocks.completeExperiment.mockResolvedValue(completed);
    const onRunChanged = vi.fn();
    render(<ExecutionPanel run={inProgress.run} onRunChanged={onRunChanged} />);

    await user.click(await screen.findByRole("button", { name: "Complete Experiment" }));
    expect(screen.getByText("1 required step is incomplete")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Complete Experiment" }));
    expect(await screen.findByText("Acknowledge the incomplete required steps before continuing.")).toBeInTheDocument();
    expect(amendmentMocks.completeExperiment).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Complete Experiment" }));
    await waitFor(() => expect(amendmentMocks.completeExperiment).toHaveBeenCalledWith(run.id, 3, "", true));
    expect(onRunChanged).toHaveBeenCalledWith(completed.run);
  });

  it("keeps an archived completed Experiment read-only with evidence and amendment history visible", async () => {
    const completed: RunExecution = {
      run: { ...run, status: "archived", actual_start_at: "2026-08-19T09:00:00Z", actual_end_at: "2026-08-19T10:00:00Z", completed_at: "2026-08-19T10:00:00Z", revision: 5 },
      steps: [{ ...step, status: "completed", actual_start_at: "2026-08-19T09:00:00Z", actual_end_at: "2026-08-19T09:01:00Z", completed_at: "2026-08-19T09:01:00Z", revision: 3 }],
    };
    mocks.getRunExecution.mockResolvedValue(completed);
    render(<ExecutionPanel run={completed.run} onRunChanged={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Experiment completed" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Step" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Step" })).not.toBeInTheDocument();
    expect(screen.getByText("Archived · Completed")).toBeInTheDocument();
    expect(screen.getByText("Evidence panel read-only")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Corrections and amendments" })).toBeInTheDocument();
  });
});
