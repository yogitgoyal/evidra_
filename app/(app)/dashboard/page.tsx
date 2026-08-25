import { StatCards } from "@/components/dashboard/StatCards";
import { StartInvestigation } from "@/components/dashboard/StartInvestigation";
import { CaseList } from "@/components/dashboard/CaseList";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { ActivityChart } from "@/components/dashboard/ActivityChart";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-7 px-6 py-8 lg:px-8 w-full min-w-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-[28px]">
          Good morning, Analyst Bhandari 👋
        </h1>
        <p className="mt-1 text-sm text-text-dim">
          <span className="font-semibold text-text">3</span> cases need your attention today
        </p>
      </div>

      <StatCards />

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-3 w-full min-w-0">
        <div className="space-y-7 lg:col-span-2 w-full min-w-0">
          <StartInvestigation />
          <ActivityChart />
          <CaseList />
        </div>
        <div className="lg:col-span-1 w-full min-w-0">
          <AlertsFeed />
        </div>
      </div>
    </div>
  );
}
