"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useNetWorth } from "@/hooks/use-net-worth";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSAR } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PERIODS = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
] as const;

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatSAR(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function NetWorthChart() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useNetWorth(months);

  const chartData = data?.map((p) => ({
    date: new Date(p.date).toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    }),
    Assets: p.assets,
    Liabilities: -Math.abs(p.liabilities),
    "Net Worth": p.netWorth,
  }));

  return (
    <Card className="transition-all duration-200 hover:-translate-y-px hover:shadow-md">
      <CardHeader>
        <CardTitle>Net worth over time</CardTitle>
        <CardAction>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.label}
                onClick={() => setMonths(p.months)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  months === p.months
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : !chartData?.length ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <TrendingUp className="size-10 opacity-40" />
            <p className="text-sm">No history yet — check back soon.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="Assets"
                stroke={CHART_COLORS.assets}
                fill={CHART_COLORS.assets}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Liabilities"
                stroke={CHART_COLORS.liabilities}
                fill={CHART_COLORS.liabilities}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Net Worth"
                stroke={CHART_COLORS.netWorth}
                fill="none"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
