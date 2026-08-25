import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EVIDRA — Unified Digital Investigation Intelligence",
  description:
    "Start with what you know. Discover what you don't — and prove it. EVIDRA fuses CDR/IPDR, banking, and social/OSINT data into one evidence-grounded investigation workbench.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-bg text-text">{children}</body>
    </html>
  );
}
