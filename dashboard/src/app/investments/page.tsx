"use client";

import { useState } from "react";
import { TrendingUp, BarChart2, Globe2, PieChart, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PLANNED_FEATURES = [
  {
    icon: BarChart2,
    title: "Portfolio Overview",
    description: "See all your holdings in one place with real-time value updates.",
  },
  {
    icon: Globe2,
    title: "Saudi (Tadawul) Stocks",
    description: "Track Tadawul-listed equities and mutual funds natively.",
  },
  {
    icon: PieChart,
    title: "Allocation Chart",
    description: "Visualise your asset allocation across sectors and asset classes.",
  },
  {
    icon: LineChart,
    title: "Performance Tracking",
    description: "Measure returns over custom periods with benchmark comparison.",
  },
];

export default function InvestmentsPage() {
  const [notified, setNotified] = useState(false);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 p-4 md:p-8">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
          <TrendingUp className="h-10 w-10 text-primary" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Investments</h1>
            <Badge variant="secondary" className="text-xs">
              Phase 2
            </Badge>
          </div>
          <p className="max-w-md text-muted-foreground">
            A full investment hub is on the roadmap for Phase 2. Here is what we are
            building — stay tuned.
          </p>
        </div>
      </div>

      {/* Planned features grid */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {PLANNED_FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-4"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Notify me */}
      <div className="flex flex-col items-center gap-2">
        {notified ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Thanks — we will let you know when it launches.
          </p>
        ) : (
          <Button
            variant="outline"
            onClick={() => setNotified(true)}
          >
            Notify me when it is ready
          </Button>
        )}
      </div>
    </div>
  );
}
