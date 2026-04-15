"use client";

import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  HandCoins,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatSAR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MetricsBarProps {
  netBalance: number;
  monthlySpending: number;
  monthlyIncome: number;
  netLending: number;
}

// Simulated trend percentages — replace with real delta when available
const MOCK_TRENDS: Record<string, number | null> = {
  "Net Balance": null,
  "Monthly Spending": 2.3,
  "Monthly Income": -1.1,
  "Net Lending": 0,
};

const metrics = (props: MetricsBarProps) => [
  {
    label: "Net Balance",
    value: props.netBalance,
    icon: Wallet,
    color:
      props.netBalance >= 0
        ? "text-emerald-700 dark:text-emerald-300"
        : "text-red-600 dark:text-red-400",
    gradient:
      props.netBalance >= 0
        ? "bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-950/30 dark:to-emerald-900/10"
        : "bg-gradient-to-br from-red-50/80 to-red-100/40 dark:from-red-950/30 dark:to-red-900/10",
    iconBg: "bg-emerald-100/70 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Monthly Spending",
    value: props.monthlySpending,
    icon: ArrowDownRight,
    color: "text-rose-700 dark:text-rose-300",
    gradient:
      "bg-gradient-to-br from-rose-50/80 to-rose-100/40 dark:from-rose-950/30 dark:to-rose-900/10",
    iconBg: "bg-rose-100/70 dark:bg-rose-900/30",
    iconColor: "text-rose-500 dark:text-rose-400",
  },
  {
    label: "Monthly Income",
    value: props.monthlyIncome,
    icon: ArrowUpRight,
    color: "text-sky-700 dark:text-sky-300",
    gradient:
      "bg-gradient-to-br from-sky-50/80 to-sky-100/40 dark:from-sky-950/30 dark:to-sky-900/10",
    iconBg: "bg-sky-100/70 dark:bg-sky-900/30",
    iconColor: "text-sky-500 dark:text-sky-400",
  },
  {
    label: "Net Lending",
    value: props.netLending,
    icon: HandCoins,
    color:
      props.netLending > 0
        ? "text-amber-700 dark:text-amber-300"
        : "text-muted-foreground",
    gradient:
      "bg-gradient-to-br from-amber-50/80 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-900/10",
    iconBg: "bg-amber-100/70 dark:bg-amber-900/30",
    iconColor: "text-amber-500 dark:text-amber-400",
  },
];

function TrendIndicator({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  if (pct === 0)
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  const up = pct > 0;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-[10px] font-medium",
        up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      )}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {up ? "+" : ""}
      {pct.toFixed(1)}% vs last month
    </span>
  );
}

export function MetricsBar(props: MetricsBarProps) {
  const items = metrics(props);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((m) => (
        <Card
          key={m.label}
          size="sm"
          className={cn(
            "rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200",
            m.gradient
          )}
        >
          <CardContent className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                m.iconBg
              )}
            >
              <m.icon className={cn("h-5 w-5", m.iconColor)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={cn("text-lg font-semibold truncate", m.color)}>
                {formatSAR(m.value)}
              </p>
              <TrendIndicator pct={MOCK_TRENDS[m.label] ?? null} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
