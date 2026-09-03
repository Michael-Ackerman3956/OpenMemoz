import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenMemoz — User-Agent Generated Content Platform",
  description:
    "A UAGC platform where users direct and AI agents curate open-source content. Exposes 32 WebMCP tools via document.modelContext.",
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
