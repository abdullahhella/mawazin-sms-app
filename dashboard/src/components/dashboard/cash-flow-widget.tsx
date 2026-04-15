"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { useCashFlow } from "@/hooks/use-cash-flow";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSAR } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

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

export function CashFlowWidget() {
  const { data, isLoading } = useCashFlow();

  const chartData = data
    ? [
        {
          name: "This Month",
          Income: data.income,
          Expenses: data.expenses,
        },
      ]
    : [];

  const net = data?.net ?? 0;

  return (
    <Card className="transition-all duration-200 hover:-translate-y-px hover:shadow-md">
      <CardHeader>
        <CardTitle>Cash Flow</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : !data ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <BarChart3 className="size-10 opacity-40" />
            <p className="text-sm">No cash flow data this month.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Net this month</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  net >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {net >= 0 ? "+" : ""}
                {formatSAR(net)}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar
                  dataKey="Income"
                  fill={CHART_COLORS.income}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Expenses"
                  fill={CHART_COLORS.expenses}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
