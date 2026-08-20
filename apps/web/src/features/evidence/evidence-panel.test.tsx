import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EvidencePanel } from "./evidence-panel";

const mocks = vi.hoisted(() => ({
  attachmentDownloadUrl: vi.fn(() => "http://localhost/download"),
  createNote: vi.fn(),
  getEvidence: vi.fn(),
  uploadAttachment: vi.fn(),
}));

vi.mock("./api", () => mocks);

const runId = "11111111-1111-4111-8111-111111111111";
const stepId = "22222222-2222-4222-8222-222222222222";
const emptyBundle = { notes: [], attachments: [], activity: [] };

describe("EvidencePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEvidence.mockResolvedValue(emptyBundle);
  });

  it("adds a Note to the explicit current-step context", async () => {
    const user = userEvent.setup();
    mocks.createNote.mockResolvedValue({ id: "note-1" });
    render(<EvidencePanel runId={runId} runStepId={stepId} />);
    await user.type(await screen.findByRole("textbox", { name: "Add note to current step" }), "Observed a color change");
    await user.click(screen.getByRole("button", { name: "Add Note" }));
    await waitFor(() => expect(mocks.createNote).toHaveBeenCalledWith(runId, "Observed a color change", stepId));
  });

  it("uploads arbitrary file evidence with a visible pending and success flow", async () => {
    const user = userEvent.setup();
    mocks.uploadAttachment.mockResolvedValue({ id: "attachment-1" });
    render(<EvidencePanel runId={runId} runStepId={stepId} />);
    await user.click(await screen.findByRole("tab", { name: "Attachments" }));
    const file = new File(["a,b\n1,2"], "results.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText("Attach to current step"), file);
    await user.click(screen.getByRole("button", { name: "Upload File" }));
    await waitFor(() => expect(mocks.uploadAttachment).toHaveBeenCalledWith(runId, file, stepId, ""));
    expect(await screen.findByText("results.csv uploaded and verified.")).toBeInTheDocument();
  });

  it("keeps completed evidence readable without ordinary write controls", async () => {
    mocks.getEvidence.mockResolvedValue({
      notes: [{
        id: "note-1",
        experiment_run_id: runId,
        run_step_record_id: null,
        content: "Observation before completion",
        created_at: "2026-08-19T09:00:00Z",
        updated_at: "2026-08-19T09:00:00Z",
        revision: 1,
      }],
      attachments: [],
      activity: [],
    });
    const user = userEvent.setup();
    render(<EvidencePanel readOnly runId={runId} runStepId={null} />);
    expect(await screen.findByText("Observation before completion")).toBeInTheDocument();
    expect(screen.getByText(/completed scientific record is read-only/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Note" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Attachments" }));
    expect(screen.queryByRole("button", { name: "Upload File" })).not.toBeInTheDocument();
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.uploadAttachment).not.toHaveBeenCalled();
  });
});
