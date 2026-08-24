import type { MessageKey } from "@/locales";

export type SecondaryNavigationItem = {
  href?: string;
  label: MessageKey;
};

export type SecondaryNavigationConfig = {
  items: readonly SecondaryNavigationItem[];
  title: MessageKey;
};

export type SecondaryNavigationRule = {
  matchPrefix: string;
  navigation:
    | SecondaryNavigationConfig
    | ((pathname: string) => SecondaryNavigationConfig);
};

function matchesModule(pathname: string, modulePath: string) {
  if (modulePath.endsWith("/")) return pathname.startsWith(modulePath);
  return pathname === modulePath || pathname.startsWith(`${modulePath}/`);
}

function createModuleRule(
  modulePath: string,
  navigation: SecondaryNavigationConfig,
): SecondaryNavigationRule {
  return {
    matchPrefix: modulePath,
    navigation,
  };
}

export const secondaryNavigationRules: readonly SecondaryNavigationRule[] = [
  {
    matchPrefix: "/experiments/projects/",
    navigation: (pathname) => {
      const projectPath = pathname.split("/").slice(0, 4).join("/");
      return {
        title: "common.project",
        items: [
          { href: projectPath, label: "navigation.overview" },
          { href: `${projectPath}/experiments`, label: "navigation.experiments" },
          { href: `${projectPath}/protocols`, label: "common.protocols" },
          { label: "navigation.planner" },
          { label: "common.files" },
          { label: "navigation.analysis" },
        ],
      };
    },
  },
  createModuleRule("/experiments", {
    title: "navigation.experiments",
    items: [
      { href: "/experiments/projects", label: "navigation.projects" },
      { href: "/experiments/runs", label: "navigation.allExperiments" },
    ],
  }),
  createModuleRule("/workbenches", {
    title: "navigation.workbenches",
    items: [
      { href: "/workbenches", label: "navigation.overview" },
      { href: "/workbenches/animal", label: "navigation.animal" },
      { href: "/workbenches/cell", label: "navigation.cell" },
      { href: "/workbenches/plate", label: "navigation.plate" },
      { href: "/workbenches/chromatography", label: "navigation.chromatography" },
    ],
  }),
  createModuleRule("/analysis", {
    title: "navigation.analysis",
    items: [
      { href: "/analysis", label: "navigation.overview" },
      { label: "navigation.generalAnalysis" },
      { label: "navigation.guidedAnalysis" },
      { label: "navigation.datasets" },
      { label: "navigation.savedAnalyses" },
      { label: "navigation.recipes" },
    ],
  }),
  createModuleRule("/resources", {
    title: "navigation.resources",
    items: [
      { href: "/resources", label: "navigation.overview" },
      { label: "navigation.calculators" },
      { label: "navigation.templates" },
      { label: "navigation.kitsManuals" },
      { label: "navigation.favorites" },
    ],
  }),
];

export function resolveSecondaryNavigation(
  pathname: string,
  rules: readonly SecondaryNavigationRule[] = secondaryNavigationRules,
) {
  const matchingRules = rules.filter((rule) => matchesModule(pathname, rule.matchPrefix));
  const mostSpecificRule = matchingRules.reduce<SecondaryNavigationRule | undefined>(
    (currentMatch, rule) =>
      !currentMatch || rule.matchPrefix.length > currentMatch.matchPrefix.length
        ? rule
        : currentMatch,
    undefined,
  );

  if (!mostSpecificRule) return undefined;
  return typeof mostSpecificRule.navigation === "function"
    ? mostSpecificRule.navigation(pathname)
    : mostSpecificRule.navigation;
}
