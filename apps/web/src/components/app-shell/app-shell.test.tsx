import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./app-shell";

const navigationState = vi.hoisted(() => ({ pathname: "/experiments/projects" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

describe("AppShell", () => {
  beforeEach(() => {
    navigationState.pathname = "/experiments/projects";
  });

  it("exposes primary, contextual, and mobile navigation semantics", () => {
    render(
      <AppShell>
        <h1>Experiments content</h1>
      </AppShell>,
    );

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Experiments navigation" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Experiments" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByText("Planned")).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveTextContent("Experiments content");
  });

  it("keeps module navigation visible on a nested route", () => {
    navigationState.pathname = "/analysis/general";

    render(
      <AppShell>
        <h1>General analysis content</h1>
      </AppShell>,
    );

    expect(screen.getByRole("complementary", { name: "Analysis navigation" })).toBeInTheDocument();
    expect(screen.getByText("General Analysis")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Analysis" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("links the global create shell to implemented Project creation", async () => {
    const user = userEvent.setup();
    render(
      <AppShell>
        <h1>Experiments content</h1>
      </AppShell>,
    );

    await user.click(screen.getByRole("button", { name: "New" }));
    expect(screen.getByRole("dialog", { name: "Create new" })).toHaveTextContent(
      "Project creation is available",
    );
    expect(screen.getByRole("link", { name: "Open Projects" })).toHaveAttribute(
      "href",
      "/experiments/projects",
    );
  });

  it("opens the search shell with its documented keyboard shortcut", async () => {
    const user = userEvent.setup();
    render(
      <AppShell>
        <h1>Experiments content</h1>
      </AppShell>,
    );

    await user.keyboard("{Control>}k{/Control}");
    expect(screen.getByRole("dialog", { name: "Search" })).toHaveTextContent(
      "No placeholder results are presented as real data",
    );
  });
});
