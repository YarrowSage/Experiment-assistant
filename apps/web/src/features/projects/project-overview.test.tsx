import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectOverview } from "./project-overview";
import type { Project } from "./types";

const mocks = vi.hoisted(() => ({ getProject: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("./api", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api")>();
  return { ...original, getProject: mocks.getProject };
});

const project: Project = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "4b8f6a4d-6bd1-5e91-a028-8d1e282b6520",
  title: "Project overview study",
  description: "A real description.",
  objective: "A real objective.",
  status: "active",
  start_date: "2026-08-19",
  end_date: null,
  tags: ["Pilot"],
  created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T09:00:00Z",
  revision: 3,
};

describe("ProjectOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProject.mockResolvedValue(project);
  });

  it("renders the persisted Project without inventing related records", async () => {
    render(<ProjectOverview projectId={project.id} />);
    expect(screen.getByRole("status", { name: "Loading Project overview" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(screen.getByText(project.objective as string)).toBeInTheDocument();
    expect(screen.getByText("Revision 3")).toBeInTheDocument();
    expect(screen.getByText(/No counts or records are invented here/)).toBeInTheDocument();
  });

  it("shows a specific API error state", async () => {
    mocks.getProject.mockRejectedValue(new Error("Project not found"));
    render(<ProjectOverview projectId={project.id} />);
    expect(
      await screen.findByRole("heading", { name: "Project could not be opened" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Project not found")).toBeInTheDocument();
  });
});
