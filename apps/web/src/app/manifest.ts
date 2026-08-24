import type { MetadataRoute } from "next";

import { DEFAULT_LOCALE, translate } from "@/locales";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: translate(DEFAULT_LOCALE, "app.name"),
    short_name: translate(DEFAULT_LOCALE, "app.name"),
    description: translate(DEFAULT_LOCALE, "app.manifestDescription"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#f7f8fa",
    orientation: "any",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
