import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExperimentRunDetail } from "./experiment-run-detail";

const mocks = vi.hoisted(() => ({ getExperimentRun: vi.fn(), listProjects: vi.fn(), listProtocols: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()), getExperimentRun: mocks.getExperimentRun,
}));
vi.mock("@/features/projects/api", () => ({ listProjects: mocks.listProjects }));
vi.mock("@/features/protocols/api", () => ({ listProtocols: mocks.listProtocols }));
vi.mock("@/features/execution/execution-panel", () => ({
  ExecutionPanel: () => <div>Execution panel</div>,
}));

describe("ExperimentRunDetail", () => {
  beforeEach(() => {
    mocks.getExperimentRun.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222", project_id: "11111111-1111-4111-8111-111111111111",
      protocol_version_id: null,
      title: "Traceable Run", description: null, purpose: "Purpose", status: "planned",
      planned_start_at: "2026-08-20T08:00:00Z", planned_end_at: null,
      actual_start_at: null, actual_end_at: null, completed_at: null, completion_note: null,
      created_at: "2026-08-19T08:00:00Z", updated_at: "2026-08-19T08:00:00Z", revision: 2,
    });
    mocks.listProjects.mockResolvedValue({ items: [{ id: "11111111-1111-4111-8111-111111111111", title: "Project One", status: "active" }], total: 1, limit: 50, offset: 0 });
    mocks.listProtocols.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
  });

  it("keeps planned and actual timing visibly separate", async () => {
    render(<ExperimentRunDetail runId="22222222-2222-4222-8222-222222222222" />);
    expect(await screen.findByRole("heading", { name: "Traceable Run" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Planned" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Actual" })).toBeInTheDocument();
    expect(screen.getByText("Revision 2")).toBeInTheDocument();
  });

  it("shows the exact immutable Protocol version assigned to the Experiment", async () => {
    mocks.getExperimentRun.mockResolvedValueOnce({
      ...(await mocks.getExperimentRun()),
      protocol_version_id: "33333333-3333-4333-8333-333333333333",
    });
    mocks.listProtocols.mockResolvedValueOnce({
      items: [{
        id: "44444444-4444-4444-8444-444444444444",
        project_id: "11111111-1111-4111-8111-111111111111",
        title: "CCK-8 Protocol",
        status: "active",
        created_at: "2026-08-19T08:00:00Z",
        updated_at: "2026-08-19T08:00:00Z",
        revision: 1,
        versions: [{
          id: "33333333-3333-4333-8333-333333333333",
          protocol_id: "44444444-4444-4444-8444-444444444444",
          version_number: 2,
          status: "published",
          change_summary: null,
          based_on_version_id: null,
          published_at: "2026-08-19T09:00:00Z",
          created_at: "2026-08-19T08:00:00Z",
          updated_at: "2026-08-19T09:00:00Z",
          revision: 3,
        }],
      }], total: 1, limit: 50, offset: 0,
    });
    render(<ExperimentRunDetail runId="22222222-2222-4222-8222-222222222222" />);
    expect(await screen.findByRole("link", { name: "CCK-8 Protocol v2" })).toBeInTheDocument();
  });
});
