import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Newsroom Agent — An Agent-Readable Newspaper",
  description:
    "A dark-mode daily edition from legally-cleared sources, exposing six WebMCP tools so browser AI agents can read alongside you.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
