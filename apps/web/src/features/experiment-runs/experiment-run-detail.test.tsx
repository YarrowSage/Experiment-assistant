import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExperimentRunDetail } from "./experiment-run-detail";

const mocks = vi.hoisted(() => ({ getExperimentRun: vi.fn(), listProjects: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()), getExperimentRun: mocks.getExperimentRun,
}));
vi.mock("@/features/projects/api", () => ({ listProjects: mocks.listProjects }));

describe("ExperimentRunDetail", () => {
  beforeEach(() => {
    mocks.getExperimentRun.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222", project_id: "11111111-1111-4111-8111-111111111111",
      title: "Traceable Run", description: null, purpose: "Purpose", status: "planned",
      planned_start_at: "2026-08-20T08:00:00Z", planned_end_at: null,
      actual_start_at: null, actual_end_at: null, completed_at: null, completion_note: null,
      created_at: "2026-08-19T08:00:00Z", updated_at: "2026-08-19T08:00:00Z", revision: 2,
    });
    mocks.listProjects.mockResolvedValue({ items: [{ id: "11111111-1111-4111-8111-111111111111", title: "Project One", status: "active" }], total: 1, limit: 50, offset: 0 });
  });

  it("keeps planned and actual timing visibly separate", async () => {
    render(<ExperimentRunDetail runId="22222222-2222-4222-8222-222222222222" />);
    expect(await screen.findByRole("heading", { name: "Traceable Run" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Planned" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Actual" })).toBeInTheDocument();
    expect(screen.getByText("Revision 2")).toBeInTheDocument();
  });
});

