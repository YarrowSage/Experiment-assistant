import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkbenchesPage from "./page";
import AnimalWorkbenchPage from "./animal/page";
import CellWorkbenchPage from "./cell/page";
import ChromatographyWorkbenchPage from "./chromatography/page";
import PlateWorkbenchPage from "./plate/page";

describe("Workbench routes", () => {
  it("renders the Workbench gallery with four exact routes", () => {
    render(<WorkbenchesPage />);

    expect(screen.getAllByRole("link", { name: "Open workbench" }).map((link) => link.getAttribute("href"))).toEqual([
      "/workbenches/animal",
      "/workbenches/cell",
      "/workbenches/plate",
      "/workbenches/chromatography",
    ]);
  });

  it.each([
    ["Animal Workbench", AnimalWorkbenchPage, "Phase 2B"],
    ["Cell Workbench", CellWorkbenchPage, "Phase 2C"],
    ["Plate Workbench", PlateWorkbenchPage, "Phase 2D"],
    ["Chromatography Workbench", ChromatographyWorkbenchPage, "Phase 2E"],
  ])("renders the planned %s route", (title, Page, phase) => {
    render(<Page />);

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(phase))).toBeInTheDocument();
  });
});
