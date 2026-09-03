import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenMemoz — AI-Powered Content Platform",
  description:
    "An open-core CMS where AI agents are writers and humans are editors. Exposes 32 WebMCP tools via document.modelContext.",
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
