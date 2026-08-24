import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { DEFAULT_LOCALE, translate } from "@/locales";
import { LocalizationProvider } from "@/locales/localization-provider";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: translate(DEFAULT_LOCALE, "app.name"),
  title: {
    default: translate(DEFAULT_LOCALE, "app.name"),
    template: translate(DEFAULT_LOCALE, "app.titleTemplate"),
  },
  description: translate(DEFAULT_LOCALE, "app.description"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/app-icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: translate(DEFAULT_LOCALE, "app.name"),
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f8fa",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <LocalizationProvider>
          <AppShell>{children}</AppShell>
        </LocalizationProvider>
      </body>
    </html>
  );
}
