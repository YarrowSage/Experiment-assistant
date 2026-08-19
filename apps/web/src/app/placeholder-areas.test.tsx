import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AnalysisPage from "./analysis/page";
import ResourcesPage from "./resources/page";
import WorkbenchesPage from "./workbenches/page";

describe("Phase 1 placeholder product areas", () => {
  it("keeps all four accepted Workbenches visibly Planned", () => {
    render(<WorkbenchesPage />);
    for (const label of ["Animal Workbench", "Cell Workbench", "Plate Workbench", "Chromatography Workbench"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Planned")).toHaveLength(4);
    expect(screen.getAllByText(/No records, models, APIs, or business actions are included in Phase 1/)).toHaveLength(4);
  });

  it("keeps Analysis an honest shell without statistics", () => {
    render(<AnalysisPage />);
    expect(screen.getByRole("heading", { name: "Analysis tools are planned" })).toBeInTheDocument();
    expect(screen.getByText(/No analytical choice is inferred here/)).toBeInTheDocument();
  });

  it("uses the frozen Resources areas and does not reintroduce Files", () => {
    render(<ResourcesPage />);
    for (const label of ["Calculators", "Templates", "Kits & Manuals", "Favorites"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("heading", { name: "Files" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Planned")).toHaveLength(4);
  });
});
