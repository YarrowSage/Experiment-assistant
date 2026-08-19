import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/experiments",
}));

describe("AppShell", () => {
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
    expect(screen.getAllByText("Planned")).toHaveLength(3);
    expect(screen.getByRole("main")).toHaveTextContent("Experiments content");
  });

  it("labels unfinished create behavior honestly", async () => {
    const user = userEvent.setup();
    render(
      <AppShell>
        <h1>Experiments content</h1>
      </AppShell>,
    );

    await user.click(screen.getByRole("button", { name: "New" }));
    expect(screen.getByRole("dialog", { name: "Create new" })).toHaveTextContent(
      "Project and experiment creation are intentionally not implemented in P1-02",
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
