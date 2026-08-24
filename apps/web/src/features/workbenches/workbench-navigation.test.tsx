import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkbenchNavigation, getWorkbenchSectionHref } from "./workbench-navigation";

const basePath = "/workbenches/animal/experiments/experiment-1";

describe("Workbench Experiment navigation", () => {
  it("renders all eight frozen destinations in desktop order", () => {
    render(<WorkbenchNavigation activeSection="overview" basePath={basePath} />);

    const navigation = screen.getByRole("complementary", {
      name: "Workbench experiment navigation",
    });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Overview",
      "Protocol",
      "Execution",
      "Timeline",
      "Evidence",
      "Analysis",
      "Files",
      "Export",
    ]);
    expect(within(navigation).getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("keeps the same order in the tablet navigation", () => {
    render(<WorkbenchNavigation activeSection="timeline" basePath={basePath} />);

    const navigation = screen.getByRole("navigation", {
      name: "Workbench experiment compact navigation",
    });
    expect(within(navigation).getAllByRole("link")).toHaveLength(8);
    expect(within(navigation).getByRole("link", { name: "Timeline" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows Overview, Execution, and More on mobile", async () => {
    const user = userEvent.setup();
    render(<WorkbenchNavigation activeSection="execution" basePath={basePath} />);

    const navigation = screen.getByRole("navigation", {
      name: "Workbench experiment mobile navigation",
    });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Overview",
      "Execution",
    ]);
    expect(within(navigation).queryByRole("link", { name: "Protocol" })).not.toBeInTheDocument();

    await user.click(within(navigation).getByRole("button", { name: "More" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "More sections" })).toBeInTheDocument();
    for (const label of ["Protocol", "Timeline", "Evidence", "Analysis", "Files", "Export"]) {
      expect(within(dialog).getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("builds future English section routes without inventing another URL scheme", () => {
    expect(getWorkbenchSectionHref(basePath, "evidence")).toBe(
      "/workbenches/animal/experiments/experiment-1/evidence",
    );
  });
});
