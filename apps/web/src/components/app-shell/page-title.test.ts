import { describe, expect, it } from "vitest";

import { resolvePageTitleKey } from "./page-title";

describe("localized page titles", () => {
  it.each([
    ["/", undefined],
    ["/planner", "planner.title"],
    ["/analysis", "analysis.title"],
    ["/workbenches", "workbenches.title"],
    ["/resources", "resources.title"],
    ["/experiments/projects", "projects.title"],
    ["/experiments/projects/project-1", "projects.overviewTitle"],
    ["/experiments/projects/project-1/experiments", "experiments.projectTitle"],
    ["/experiments/projects/project-1/protocols", "protocols.title"],
    ["/experiments/projects/project-1/protocols/protocol-1", "common.protocol"],
    ["/experiments/runs", "navigation.allExperiments"],
    ["/experiments/runs/run-1", "common.experiment"],
  ])("maps %s to %s", (pathname, key) => {
    expect(resolvePageTitleKey(pathname)).toBe(key);
  });
});
