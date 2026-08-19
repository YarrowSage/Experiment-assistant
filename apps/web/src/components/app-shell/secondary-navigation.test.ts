import { describe, expect, it } from "vitest";

import { resolveSecondaryNavigation } from "./secondary-navigation";

function labelsFor(pathname: string) {
  return resolveSecondaryNavigation(pathname)?.items.map((item) => item.label);
}

describe("secondary navigation", () => {
  it.each([
    ["/workbenches/cell", "Workbenches"],
    ["/analysis/general", "Analysis"],
    ["/resources/calculators", "Resources"],
  ])("resolves %s to the %s module navigation", (pathname, title) => {
    expect(resolveSecondaryNavigation(pathname)?.title).toBe(title);
  });

  it("uses the frozen Analysis navigation labels", () => {
    expect(labelsFor("/analysis")).toEqual([
      "Overview",
      "General Analysis",
      "Guided Analysis",
      "Datasets",
      "Saved Analyses",
      "Recipes",
    ]);
  });

  it("uses the frozen Resources navigation labels", () => {
    expect(labelsFor("/resources")).toEqual([
      "Overview",
      "Calculators",
      "Templates",
      "Kits & Manuals",
      "Favorites",
    ]);
  });

  it("keeps the accepted Workbenches navigation labels", () => {
    expect(labelsFor("/workbenches")).toEqual([
      "Overview",
      "Animal",
      "Cell",
      "Plate",
      "Chromatography",
    ]);
  });

  it("keeps the Experiments shell limited to its accepted top-level areas", () => {
    const navigation = resolveSecondaryNavigation("/experiments/projects");
    expect(navigation?.items.map((item) => item.label)).toEqual(["Projects", "All Experiments"]);
    expect(navigation?.items[0]).toEqual({
      href: "/experiments/projects",
      label: "Projects",
    });
    expect(navigation?.items[1]).toEqual({
      href: "/experiments/runs",
      label: "All Experiments",
    });
  });

  it("provides the frozen contextual navigation for a specific Project", () => {
    const navigation = resolveSecondaryNavigation("/experiments/projects/project-1");
    expect(navigation?.title).toBe("Project");
    expect(navigation?.items.map((item) => item.label)).toEqual([
      "Overview",
      "Experiments",
      "Protocols",
      "Planner",
      "Files",
      "Analysis",
    ]);
    expect(navigation?.items[0]?.href).toBe("/experiments/projects/project-1");
    expect(navigation?.items[1]?.href).toBe(
      "/experiments/projects/project-1/experiments",
    );
  });

  it("prefers a more specific contextual rule over its module fallback", () => {
    const navigation = resolveSecondaryNavigation("/experiments/projects/project-1", [
      {
        matchPrefix: "/experiments",
        navigation: { items: [{ label: "Projects" }], title: "Experiments" },
      },
      {
        matchPrefix: "/experiments/projects",
        navigation: { items: [{ label: "Overview" }], title: "Project" },
      },
    ]);

    expect(navigation?.title).toBe("Project");
  });
});
