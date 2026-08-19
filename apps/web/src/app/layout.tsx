import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Experiment Assistant",
    template: "%s · Experiment Assistant",
  },
  description: "A modular assistant for scientific experiment workflows.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
