"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { useAccounts } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { AccountBalanceChart } from "@/components/accounts/account-balance-chart";
import { TransactionList } from "@/components/accounts/transaction-list";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSAR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountDetailPageProps {
  params: Promise<{ accountId: string }>;
}

export default function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { accountId } = use(params);
  const { data: accountsData, isLoading: loadingAccounts } = useAccounts("asset");
  const { data: txData, isLoading: loadingTx } = useTransactions({
    accountId,
    limit: 100,
  });

  const account = useMemo(() => {
    if (!accountsData) return null;
    return accountsData.data.find((a) => a.id === accountId) ?? null;
  }, [accountsData, accountId]);

  const isLoading = loadingAccounts || loadingTx;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[240px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-muted-foreground">
        <SearchX className="size-10 opacity-40" />
        <p className="text-sm font-medium">Account not found.</p>
        <Link
          href="/accounts"
          className="text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Back to accounts
        </Link>
      </div>
    );
  }

  const balance = parseFloat(account.attributes.current_balance);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/accounts"
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{account.attributes.name}</h1>
          <p
            className={cn(
              "text-lg font-semibold",
              balance >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {formatSAR(balance)}
          </p>
        </div>
      </div>

      <Card className="transition-all duration-200 hover:-translate-y-px hover:shadow-md">
        <CardHeader>
          <CardTitle>Balance History</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountBalanceChart accountId={accountId} currentBalance={balance} />
        </CardContent>
      </Card>

      <Card className="transition-all duration-200 hover:-translate-y-px hover:shadow-md">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList transactions={txData?.data ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
