import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectApiError } from "./api";
import { ProjectsPage } from "./projects-page";
import type { Project, ProjectListResponse } from "./types";

const apiMocks = vi.hoisted(() => ({
  archiveProject: vi.fn(),
  createProject: vi.fn(),
  getProject: vi.fn(),
  listProjects: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("./api", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api")>();
  return { ...original, ...apiMocks };
});

const project: Project = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "4b8f6a4d-6bd1-5e91-a028-8d1e282b6520",
  title: "Cell viability study",
  description: "Compare treatment response.",
  objective: "Measure viability.",
  status: "planning",
  start_date: "2026-08-19",
  end_date: "2026-08-20",
  tags: ["CCK-8"],
  created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T08:00:00Z",
  revision: 1,
};

function listResponse(items: Project[]): ProjectListResponse {
  return { items, total: items.length, limit: 50, offset: 0 };
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listProjects.mockResolvedValue(listResponse([]));
  });

  it("shows the loading state while Projects are being fetched", () => {
    apiMocks.listProjects.mockReturnValue(new Promise(() => undefined));
    render(<ProjectsPage />);
    expect(screen.getByRole("status", { name: "Loading projects" })).toBeInTheDocument();
  });

  it("shows an honest empty state", async () => {
    render(<ProjectsPage />);
    expect(await screen.findByRole("heading", { name: "No Projects yet" })).toBeInTheDocument();
  });

  it("renders Projects returned by the API", async () => {
    apiMocks.listProjects.mockResolvedValue(listResponse([project]));
    render(<ProjectsPage />);
    expect(await screen.findByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(screen.getByText("Planning", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("CCK-8")).toBeInTheDocument();
  });

  it("validates creation and refreshes after a successful API-backed create", async () => {
    const user = userEvent.setup();
    apiMocks.listProjects
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([project]));
    apiMocks.createProject.mockResolvedValue(project);
    render(<ProjectsPage />);
    await screen.findByRole("heading", { name: "No Projects yet" });

    await user.click(screen.getAllByRole("button", { name: "New Project" })[0]);
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(screen.getByText("Project name is required.")).toBeInTheDocument();
    expect(apiMocks.createProject).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: /Project name/ }), project.title);
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(apiMocks.createProject).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: project.title })).toBeInTheDocument();
  });

  it("shows API load failures", async () => {
    apiMocks.listProjects.mockRejectedValue(new Error("API offline"));
    render(<ProjectsPage />);
    expect(
      await screen.findByRole("heading", { name: "Projects could not be loaded" }),
    ).toBeInTheDocument();
    expect(screen.getByText("API offline")).toBeInTheDocument();
  });

  it("edits a Project with its current revision", async () => {
    const user = userEvent.setup();
    const updated = { ...project, title: "Updated viability study", revision: 2 };
    apiMocks.listProjects
      .mockResolvedValueOnce(listResponse([project]))
      .mockResolvedValueOnce(listResponse([updated]));
    apiMocks.updateProject.mockResolvedValue(updated);
    render(<ProjectsPage />);
    await screen.findByRole("heading", { name: project.title });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const title = screen.getByRole("textbox", { name: /Project name/ });
    await user.clear(title);
    await user.type(title, updated.title);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(apiMocks.updateProject).toHaveBeenCalledWith(
        project.id,
        project.revision,
        expect.objectContaining({ title: updated.title }),
      ),
    );
    expect(await screen.findByRole("heading", { name: updated.title })).toBeInTheDocument();
  });

  it("confirms archive and removes the Project after the API succeeds", async () => {
    const user = userEvent.setup();
    apiMocks.listProjects
      .mockResolvedValueOnce(listResponse([project]))
      .mockResolvedValueOnce(listResponse([]));
    apiMocks.archiveProject.mockResolvedValue({ ...project, status: "archived", revision: 2 });
    render(<ProjectsPage />);
    await screen.findByRole("heading", { name: project.title });

    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByRole("dialog", { name: "Archive project?" })).toHaveTextContent(
      "will not be deleted",
    );
    await user.click(screen.getByRole("button", { name: "Archive project" }));

    await waitFor(() =>
      expect(apiMocks.archiveProject).toHaveBeenCalledWith(project.id, project.revision),
    );
    expect(await screen.findByRole("heading", { name: "No Projects yet" })).toBeInTheDocument();
  });

  it("shows a clear revision conflict during edit", async () => {
    const user = userEvent.setup();
    apiMocks.listProjects.mockResolvedValue(listResponse([project]));
    apiMocks.updateProject.mockRejectedValue(
      new ProjectApiError("Revision conflict", 409, "project_revision_conflict"),
    );
    render(<ProjectsPage />);
    await screen.findByRole("heading", { name: project.title });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByText("This project changed after you opened it. Refresh the project before trying again."),
    ).toBeInTheDocument();
  });
});
