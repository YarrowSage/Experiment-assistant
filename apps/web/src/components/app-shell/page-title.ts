import type { MessageKey } from "@/locales";

export function resolvePageTitleKey(pathname: string): MessageKey | undefined {
  if (pathname === "/") return undefined;
  if (pathname === "/planner") return "planner.title";
  if (pathname === "/analysis" || pathname.startsWith("/analysis/")) return "analysis.title";
  if (pathname === "/workbenches" || pathname.startsWith("/workbenches/")) {
    return "workbenches.title";
  }
  if (pathname === "/resources" || pathname.startsWith("/resources/")) return "resources.title";
  if (/^\/experiments\/projects\/[^/]+\/protocols\/[^/]+/.test(pathname)) {
    return "common.protocol";
  }
  if (/^\/experiments\/projects\/[^/]+\/protocols(?:\/|$)/.test(pathname)) {
    return "protocols.title";
  }
  if (/^\/experiments\/projects\/[^/]+\/experiments(?:\/|$)/.test(pathname)) {
    return "experiments.projectTitle";
  }
  if (/^\/experiments\/projects\/[^/]+(?:\/|$)/.test(pathname)) {
    return "projects.overviewTitle";
  }
  if (pathname === "/experiments/projects") return "projects.title";
  if (/^\/experiments\/runs\/[^/]+(?:\/|$)/.test(pathname)) return "common.experiment";
  if (pathname === "/experiments" || pathname === "/experiments/runs") {
    return "navigation.allExperiments";
  }
  return undefined;
}
