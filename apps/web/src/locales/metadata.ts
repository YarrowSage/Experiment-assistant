import type { Metadata } from "next";

import { DEFAULT_LOCALE, translate, type MessageKey } from "./index";

export function createLocalizedMetadata(titleKey: MessageKey): Metadata {
  return { title: translate(DEFAULT_LOCALE, titleKey) };
}
