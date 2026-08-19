import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Experiment Assistant",
  description: "A modular assistant for scientific experiment workflows.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
