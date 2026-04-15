"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSAR, formatDateShort } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";

interface AccountBalanceChartProps {
  accountId: string;
  currentBalance: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{formatSAR(payload[0].value)}</p>
    </div>
  );
}

export function AccountBalanceChart({ accountId, currentBalance }: AccountBalanceChartProps) {
  const { data, isLoading } = useTransactions({ accountId, limit: 200 });

  const chartData = useMemo(() => {
    if (!data?.data?.length) return [];

    // Flatten all splits, sort by date descending (newest first)
    const txns: { date: string; amount: number; type: string }[] = [];
    for (const group of data.data) {
      for (const split of group.attributes.transactions) {
        txns.push({
          date: split.date,
          amount: parseFloat(split.amount),
          type: split.type,
        });
      }
    }
    txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Work backwards from current_balance to compute true historical balance.
    // The last entry in the reversed series is currentBalance (today).
    // For each transaction going backwards, undo its effect to find the
    // balance before that transaction occurred.
    let balance = currentBalance;
    const dailyMap = new Map<string, number>();

    // First record today's balance (most recent date in transactions)
    for (const txn of txns) {
      const dateKey = txn.date.split("T")[0];
      // Record current balance for this date before undoing
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, balance);
      }
      // Undo the effect of this transaction to get balance before it
      const delta = txn.type === "withdrawal" ? -txn.amount : txn.amount;
      balance -= delta;
    }

    // dailyMap now holds balance-after-all-txns-on-that-day, oldest entries
    // have the earliest reconstructed balances. Sort ascending (oldest → newest).
    const entries = Array.from(dailyMap.entries());
    entries.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    return entries.map(([date, bal]) => ({
      date: formatDateShort(date),
      Balance: bal,
    }));
  }, [data, currentBalance]);

  if (isLoading) {
    return <Skeleton className="h-[240px] w-full" />;
  }

  if (!chartData.length) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <LineChartIcon className="size-10 opacity-40" />
        <p className="text-sm">No transaction history yet.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="Balance"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
