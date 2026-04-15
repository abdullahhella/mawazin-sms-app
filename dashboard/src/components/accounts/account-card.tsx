"use client";

import Link from "next/link";
import { Landmark, PiggyBank, Wallet, CreditCard, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatSAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountSummary } from "@/types/app";

interface AccountCardProps {
  account: AccountSummary;
}

function AccountIcon({ role }: { role: string | null }) {
  const base = "h-5 w-5";
  switch (role) {
    case "defaultAsset":
      return <Landmark className={cn(base, "text-sky-500 dark:text-sky-400")} />;
    case "savingAsset":
      return <PiggyBank className={cn(base, "text-emerald-500 dark:text-emerald-400")} />;
    case "cashWalletAsset":
      return <Wallet className={cn(base, "text-amber-500 dark:text-amber-400")} />;
    case "creditCard":
      return <CreditCard className={cn(base, "text-rose-500 dark:text-rose-400")} />;
    default:
      return <Banknote className={cn(base, "text-muted-foreground")} />;
  }
}

export function AccountCard({ account }: AccountCardProps) {
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 hover:bg-muted/50 hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <AccountIcon role={account.role} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{account.name}</p>
          {account.role && (
            <Badge variant="secondary" className="mt-0.5 text-[10px]">
              {account.role === "defaultAsset"
                ? "Checking"
                : account.role === "savingAsset"
                  ? "Savings"
                  : account.role === "cashWalletAsset"
                    ? "Cash"
                    : account.role === "creditCard"
                      ? "Credit"
                      : account.role}
            </Badge>
          )}
        </div>
      </div>
      <p
        className={cn(
          "text-base font-bold shrink-0 ml-4",
          account.balance >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        )}
      >
        {formatSAR(account.balance)}
      </p>
    </Link>
  );
}
