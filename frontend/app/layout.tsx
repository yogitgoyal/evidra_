import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { EvidenceProvider } from "@/components/evidence/EvidenceProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

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
      <body className={`${inter.variable} ${jetBrainsMono.variable} antialiased bg-bg text-text`}>
        <EvidenceProvider caseId={null}>{children}</EvidenceProvider>
      </body>
    </html>
  );
}
