 "use client";

import { EvidenceProvider } from "@/components/evidence/EvidenceProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useParams } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const caseId = (useParams()?.id as string | undefined) ?? null;
  return (
    <EvidenceProvider caseId={caseId}>
      <div className="bg-command flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </EvidenceProvider>
  );
}
