import { enUS, type MessageKey } from "./en-US";
import { zhCN } from "./zh-CN";

export type Locale = "zh-CN" | "en-US";
export type TranslationValues = Record<string, string | number>;
export type TranslationFunction = (key: MessageKey, values?: TranslationValues) => string;

export const DEFAULT_LOCALE: Locale = "zh-CN";
export const LOCALE_STORAGE_KEY = "experiment-assistant.locale";

const catalogs = {
  "en-US": enUS,
  "zh-CN": zhCN,
} as const;

export function isLocale(value: string | null): value is Locale {
  return value === "zh-CN" || value === "en-US";
}

export function translate(locale: Locale, key: MessageKey, values?: TranslationValues) {
  const template: string = catalogs[locale][key];
  if (!values) return template;
  return template.replace(/\{([^}]+)\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

export function presentError(
  cause: unknown,
  t: TranslationFunction,
  fallbackKey: MessageKey,
): string {
  if (
    cause &&
    typeof cause === "object" &&
    "status" in cause &&
    cause.status === 0
  ) {
    return t("common.localApiUnavailable");
  }

  if (
    cause instanceof Error &&
    "status" in cause &&
    typeof cause.status === "number" &&
    "code" in cause &&
    typeof cause.code === "string" &&
    cause.message === cause.code
  ) {
    return t("common.requestFailedWithStatus", { status: cause.status });
  }

  return cause instanceof Error ? cause.message : t(fallbackKey);
}

export type { MessageKey } from "./en-US";
