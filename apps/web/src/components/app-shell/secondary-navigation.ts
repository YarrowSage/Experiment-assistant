export type SecondaryNavigationItem = {
  href?: string;
  label: string;
};

export type SecondaryNavigationConfig = {
  items: readonly SecondaryNavigationItem[];
  title: string;
};

export type SecondaryNavigationRule = {
  matchPrefix: string;
  navigation: SecondaryNavigationConfig;
};

function matchesModule(pathname: string, modulePath: string) {
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
  createModuleRule("/experiments", {
    title: "Experiments",
    items: [{ label: "Projects" }, { label: "All Experiments" }],
  }),
  createModuleRule("/workbenches", {
    title: "Workbenches",
    items: [
      { href: "/workbenches", label: "Overview" },
      { label: "Animal" },
      { label: "Cell" },
      { label: "Plate" },
      { label: "Chromatography" },
    ],
  }),
  createModuleRule("/analysis", {
    title: "Analysis",
    items: [
      { href: "/analysis", label: "Overview" },
      { label: "General Analysis" },
      { label: "Guided Analysis" },
      { label: "Datasets" },
      { label: "Saved Analyses" },
      { label: "Recipes" },
    ],
  }),
  createModuleRule("/resources", {
    title: "Resources",
    items: [
      { href: "/resources", label: "Overview" },
      { label: "Calculators" },
      { label: "Templates" },
      { label: "Kits & Manuals" },
      { label: "Favorites" },
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

  return mostSpecificRule?.navigation;
}
