"use client";

/**
 * Widget renderer — each widget returns a full Card that fills height.
 * Kept self-contained so the WidgetShell wrapper can stay simple.
 */

import { useMemo } from "react";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  HandCoins,
  CreditCard,
  PiggyBank,
  Receipt,
  ListOrdered,
  Hash,
  Activity,
  Bot,
  MessageSquare,
  Smartphone,
  LayoutDashboard,
  HelpCircle,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { formatSAR, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WidgetInstance, ChartType } from "@/lib/widgets/types";
import { useAccounts } from "@/hooks/use-accounts";
import { useCashFlow } from "@/hooks/use-cash-flow";
import { useTransactions } from "@/hooks/use-transactions";
import { getOrigin, ORIGIN_META, type TransactionOrigin } from "@/lib/transaction-origin";
import { isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import type { ComponentType } from "react";
import { NetWorthChart } from "@/components/dashboard/net-worth-chart";
import { CashFlowWidget } from "@/components/dashboard/cash-flow-widget";
import { UpcomingBills } from "@/components/dashboard/upcoming-bills";
import { AlertsInbox } from "@/components/dashboard/alerts-inbox";
import { NeedsContextWidget } from "@/components/dashboard/needs-context-widget";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { CHART_COLORS, CATEGORY_PALETTE } from "@/lib/constants";

export function WidgetRenderer({ widget }: { widget: WidgetInstance }) {
  switch (widget.type) {
    case "metric-net-balance":
      return <MetricNetBalance />;
    case "metric-monthly-spending":
      return <MetricMonthlySpending />;
    case "metric-monthly-income":
      return <MetricMonthlyIncome />;
    case "metric-net-lending":
      return <MetricNetLending />;
    case "metric-liabilities":
      return <MetricLiabilities />;
    case "metric-savings-rate":
      return <MetricSavingsRate />;

    case "chart-net-worth":
      return <NetWorthChart />;
    case "chart-cash-flow":
      return <CashFlowWidget />;
    case "chart-spending-by-category":
      return (
        <SpendingByCategoryChart
          chartType={widget.config?.chartType ?? "pie"}
        />
      );
    case "chart-income-vs-expenses":
      return <IncomeVsExpensesChart />;

    case "list-accounts":
      return <AccountsList />;
    case "list-upcoming-bills":
      return <UpcomingBills />;
    case "list-recent-transactions":
      return <RecentTransactionsList limit={widget.config?.limit ?? 8} />;
    case "list-top-categories":
      return <TopCategoriesList limit={widget.config?.limit ?? 5} />;

    case "inbox-alerts":
      return <AlertsInbox />;
    case "inbox-needs-context":
      return <NeedsContextWidget />;

    case "stat-accounts-count":
      return <StatAccountsCount />;
    case "stat-transactions-this-month":
      return <StatTransactionsThisMonth />;

    case "note-heading":
      return (
        <div className="flex h-full items-center px-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {widget.config?.text ?? widget.config?.title ?? "New section"}
          </h2>
        </div>
      );

    default:
      return (
        <Card className="h-full">
          <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Unknown widget: {widget.type}
          </CardContent>
        </Card>
      );
  }
}

// ─── Metric card (used by multiple metrics) ────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  trend?: { value: number; positive?: boolean };
}) {
  return (
    <Card className="relative h-full overflow-hidden">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.08]",
          accent
        )}
        aria-hidden
      />
      <CardContent className="relative flex h-full flex-col justify-between gap-3 py-3">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-border">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          {trend && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                trend.positive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
              )}
            >
              {trend.positive ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}%
            </span>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold leading-tight">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricNetBalance() {
  const { data } = useAccounts("asset");
  const total = useMemo(() => {
    return (
      data?.data.reduce(
        (sum, a) => sum + parseFloat(a.attributes.current_balance),
        0
      ) ?? 0
    );
  }, [data]);
  return (
    <MetricCard
      label="Net balance"
      value={formatSAR(total)}
      icon={Wallet}
      accent="from-emerald-400 to-teal-500"
      trend={{ value: 2.3, positive: true }}
    />
  );
}

function MetricMonthlySpending() {
  const { data } = useCashFlow();
  return (
    <MetricCard
      label="Monthly spending"
      value={formatSAR(data?.expenses ?? 0)}
      icon={ArrowDownRight}
      accent="from-rose-400 to-red-500"
      trend={{ value: 1.4, positive: false }}
    />
  );
}

function MetricMonthlyIncome() {
  const { data } = useCashFlow();
  return (
    <MetricCard
      label="Monthly income"
      value={formatSAR(data?.income ?? 0)}
      icon={ArrowUpRight}
      accent="from-sky-400 to-blue-500"
      trend={{ value: 5.1, positive: true }}
    />
  );
}

function MetricNetLending() {
  const { data, isLoading } = useAccounts("liability");
  const net = useMemo(() => {
    if (!data) return null;
    // In mock mode the liability endpoint returns all accounts including
    // non-liability types, so filter to only liability entries.
    const liabilities = data.data.filter(
      (a) => a.attributes.type === "liability"
    );
    let positives = 0;
    let negatives = 0;
    for (const a of liabilities) {
      const bal = parseFloat(a.attributes.current_balance);
      if (bal >= 0) positives += bal;
      else negatives += Math.abs(bal);
    }
    return positives - negatives;
  }, [data]);
  return (
    <MetricCard
      label="Net lending"
      value={isLoading || net === null ? "—" : formatSAR(net)}
      icon={HandCoins}
      accent="from-amber-400 to-orange-500"
    />
  );
}

function MetricLiabilities() {
  const { data } = useAccounts("liability");
  const total = useMemo(() => {
    return (
      data?.data.reduce(
        (sum, a) => sum + Math.abs(parseFloat(a.attributes.current_balance)),
        0
      ) ?? 0
    );
  }, [data]);
  return (
    <MetricCard
      label="Total liabilities"
      value={formatSAR(total)}
      icon={CreditCard}
      accent="from-fuchsia-400 to-purple-500"
    />
  );
}

function MetricSavingsRate() {
  const { data } = useCashFlow();
  const rate = useMemo(() => {
    const inc = data?.income ?? 0;
    const exp = data?.expenses ?? 0;
    if (inc <= 0) return 0;
    return Math.max(0, ((inc - exp) / inc) * 100);
  }, [data]);
  return (
    <MetricCard
      label="Savings rate"
      value={`${rate.toFixed(1)}%`}
      icon={PiggyBank}
      accent="from-lime-400 to-green-500"
      trend={{ value: 3.2, positive: true }}
    />
  );
}

function StatAccountsCount() {
  const { data } = useAccounts("asset");
  const count = data?.data.length ?? 0;
  return (
    <MetricCard
      label="Accounts"
      value={`${count}`}
      icon={Hash}
      accent="from-gray-400 to-gray-500"
    />
  );
}

function StatTransactionsThisMonth() {
  const { data, isLoading } = useTransactions({ limit: 500 });
  const count = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    let n = 0;
    for (const group of data.data) {
      for (const split of group.attributes.transactions) {
        if (isWithinInterval(new Date(split.date), interval)) {
          n++;
        }
      }
    }
    return n;
  }, [data]);
  return (
    <MetricCard
      label="Transactions"
      value={isLoading || count === null ? "—" : `${count}`}
      icon={Activity}
      accent="from-indigo-400 to-blue-500"
    />
  );
}

// ─── Origin dot (mini badge used in RecentTransactionsList) ─

const ORIGIN_ICONS: Record<TransactionOrigin, ComponentType<LucideProps>> = {
  bot: Bot,
  sms: MessageSquare,
  ios: Smartphone,
  dashboard: LayoutDashboard,
  unknown: HelpCircle,
};

function OriginDot({ tags }: { tags: string[] }) {
  const origin = getOrigin(tags);
  const meta = ORIGIN_META[origin];
  const Icon = ORIGIN_ICONS[origin];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            className={cn(
              "h-4 w-4 cursor-default rounded-full border p-0 shrink-0",
              meta.colorClass
            )}
            aria-label={meta.label}
          >
            <Icon className="h-2.5 w-2.5" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{meta.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Normalise Firefly's mixed tag array (string | {tag:string})[] to string[] */
function normaliseTags(
  raw: (string | { tag: string })[] | null | undefined
): string[] {
  if (!raw) return [];
  return raw.map((t) => (typeof t === "string" ? t : t.tag));
}

// ─── Lists ──────────────────────────────────────────────────

function AccountsList() {
  const { data } = useAccounts("asset");
  const accounts = data?.data ?? [];
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-muted-foreground" />
          <CardTitle>Accounts</CardTitle>
        </div>
        <CardDescription>{accounts.length} asset accounts</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <ul className="space-y-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-md border bg-background/50 px-3 py-2 text-sm"
              >
                <span className="truncate">{a.attributes.name}</span>
                <span className="font-medium">
                  {formatSAR(parseFloat(a.attributes.current_balance))}
                </span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function RecentTransactionsList({ limit }: { limit: number }) {
  const { data, isLoading } = useTransactions({ limit });

  // Flatten groups → splits, keeping only the first split per group
  const rows = useMemo(() => {
    if (!data) return [];
    return data.data.flatMap((group) =>
      group.attributes.transactions.slice(0, 1).map((split) => ({
        id: group.id,
        type: split.type,
        date: split.date,
        amount: parseFloat(split.amount),
        description: split.description,
        categoryName: split.category_name,
        destinationName: split.destination_name,
        tags: normaliseTags(split.tags),
      }))
    );
  }, [data]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="size-4 text-muted-foreground" />
          <CardTitle>Recent transactions</CardTitle>
        </div>
        <CardDescription>Latest {limit} across all accounts</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {isLoading ? (
            <ul className="space-y-2">
              {Array.from({ length: limit }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-10 w-full rounded-md" />
                </li>
              ))}
            </ul>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No transactions found
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rows.map((tx) => {
                const isExpense = tx.type === "withdrawal";
                const isIncome = tx.type === "deposit";
                const amountClass = isExpense
                  ? "text-red-600 dark:text-red-400"
                  : isIncome
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground";
                const sign = isExpense ? "-" : isIncome ? "+" : "";
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-2 rounded-md border bg-background/50 px-3 py-2"
                  >
                    <OriginDot tags={tx.tags} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{tx.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateShort(tx.date)}
                        {(tx.categoryName ?? tx.destinationName) && (
                          <> &middot; {tx.categoryName ?? tx.destinationName}</>
                        )}
                      </p>
                    </div>
                    <span className={cn("shrink-0 font-semibold", amountClass)}>
                      {sign}
                      {formatSAR(tx.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function TopCategoriesList({ limit }: { limit: number }) {
  const { data, isLoading } = useCashFlow();

  // byCategory is Record<string, number>; sort desc, slice to limit
  const cats = useMemo(() => {
    if (!data?.byCategory) return [];
    return Object.entries(data.byCategory)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }, [data, limit]);

  const max = cats.length > 0 ? Math.max(...cats.map((c) => c.total)) : 1;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-muted-foreground" />
          <CardTitle>Top categories</CardTitle>
        </div>
        <CardDescription>Biggest spending this month</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {isLoading ? (
            <ul className="space-y-3">
              {Array.from({ length: limit }).map((_, i) => (
                <li key={i} className="space-y-1">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </li>
              ))}
            </ul>
          ) : cats.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No category data available
            </p>
          ) : (
            <ul className="space-y-2">
              {cats.map((c, i) => (
                <li key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{c.name}</span>
                    <span className="font-medium">{formatSAR(c.total)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.total / max) * 100}%`,
                        background:
                          CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Charts ─────────────────────────────────────────────────

function SpendingByCategoryChart({ chartType }: { chartType: ChartType }) {
  const data = [
    { name: "Groceries", value: 1240 },
    { name: "Eating out", value: 890 },
    { name: "Transport", value: 450 },
    { name: "Utilities", value: 380 },
    { name: "Entertainment", value: 220 },
    { name: "Health", value: 180 },
  ];
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <CardDescription>This month</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <ReTooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
                  />
                ))}
              </Pie>
              <ReTooltip />
            </PieChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function IncomeVsExpensesChart() {
  const { data } = useCashFlow();
  const chartData = [
    {
      period: "This month",
      income: data?.income ?? 0,
      expenses: data?.expenses ?? 0,
    },
  ];
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Income vs expenses</CardTitle>
        <CardDescription>This month at a glance</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="period" className="text-xs" />
            <YAxis className="text-xs" />
            <ReTooltip />
            <Bar
              dataKey="income"
              fill={CHART_COLORS.income}
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              fill={CHART_COLORS.expenses}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
