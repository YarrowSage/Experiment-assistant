import { describe, expect, it } from "vitest";

import {
  getWorkbenchDefinition,
  isWorkbenchId,
  workbenchRegistry,
  workbenchSections,
} from "./registry";

describe("Workbench registry", () => {
  it("registers exactly the four frozen V1 Workbenches", () => {
    expect(workbenchRegistry.map((workbench) => workbench.id)).toEqual([
      "animal",
      "cell",
      "plate",
      "chromatography",
    ]);
  });

  it("keeps unavailable domain functionality honestly planned", () => {
    for (const workbench of workbenchRegistry) {
      expect(workbench).toMatchObject({
        availableSections: [],
        descriptionKey: expect.stringMatching(/^workbench\./),
        nameKey: expect.stringMatching(/^workbench\./),
        route: `/workbenches/${workbench.id}`,
        status: "planned",
      });
    }
  });

  it("freezes the shared Experiment detail section order", () => {
    expect(workbenchSections.map((section) => section.id)).toEqual([
      "overview",
      "protocol",
      "execution",
      "timeline",
      "evidence",
      "analysis",
      "files",
      "export",
    ]);
  });

  it("resolves and validates registered ids", () => {
    expect(isWorkbenchId("animal")).toBe(true);
    expect(isWorkbenchId("analysis")).toBe(false);
    expect(getWorkbenchDefinition("chromatography").route).toBe(
      "/workbenches/chromatography",
    );
  });
});
