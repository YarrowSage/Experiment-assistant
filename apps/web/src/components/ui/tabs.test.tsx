import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tabs } from "./tabs";

describe("Tabs", () => {
  it("switches panels with click and keyboard navigation", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        ariaLabel="Example views"
        items={[
          { content: <p>First panel</p>, label: "First", value: "first" },
          { content: <p>Second panel</p>, label: "Second", value: "second" },
        ]}
      />,
    );

    const firstTab = screen.getByRole("tab", { name: "First" });
    const secondTab = screen.getByRole("tab", { name: "Second" });

    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("First panel")).toBeVisible();

    await user.click(secondTab);
    expect(secondTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Second panel")).toBeVisible();

    await user.keyboard("{ArrowLeft}");
    expect(firstTab).toHaveFocus();
    expect(firstTab).toHaveAttribute("aria-selected", "true");
  });
});
