"use client";

import { useMemo } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountGroup } from "@/components/accounts/account-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACCOUNT_GROUPS,
  DEFAULT_ACCOUNT_GROUP,
} from "@/lib/constants";
import type { AccountGroup as AccountGroupType, AccountSummary } from "@/types/app";

export default function AccountsPage() {
  const { data: assetData, isLoading: loadingAssets } = useAccounts("asset");
  const { data: expenseData, isLoading: loadingExpenses } = useAccounts("expense");
  const { data: revenueData, isLoading: loadingRevenue } = useAccounts("revenue");

  const isLoading = loadingAssets || loadingExpenses || loadingRevenue;

  const groups = useMemo(() => {
    if (!assetData) return [];

    // Build account summaries from asset accounts
    const accounts: AccountSummary[] = assetData.data.map((a) => ({
      id: a.id,
      name: a.attributes.name,
      balance: parseFloat(a.attributes.current_balance),
      currencyCode: a.attributes.currency_code,
      role: a.attributes.account_role,
      type: a.attributes.type,
      active: a.attributes.active,
    }));

    // Group accounts by role
    const groupMap = new Map<string, AccountSummary[]>();
    for (const account of accounts) {
      const role = account.role || "defaultAsset";
      const list = groupMap.get(role) ?? [];
      list.push(account);
      groupMap.set(role, list);
    }

    // Build AccountGroup objects and sort by configured order
    const result: AccountGroupType[] = [];
    for (const [role, accts] of groupMap) {
      const config = ACCOUNT_GROUPS[role] ?? DEFAULT_ACCOUNT_GROUP;
      result.push({
        label: config.label,
        type: role,
        icon: config.icon,
        accounts: accts,
        totalBalance: accts.reduce((sum, a) => sum + a.balance, 0),
      });
    }

    result.sort((a, b) => {
      const orderA = ACCOUNT_GROUPS[a.type]?.order ?? DEFAULT_ACCOUNT_GROUP.order;
      const orderB = ACCOUNT_GROUPS[b.type]?.order ?? DEFAULT_ACCOUNT_GROUP.order;
      return orderA - orderB;
    });

    // Add empty Investment group placeholder if no investment accounts exist
    if (!groupMap.has("investment")) {
      result.push({
        label: ACCOUNT_GROUPS.investment.label,
        type: "investment",
        icon: ACCOUNT_GROUPS.investment.icon,
        accounts: [],
        totalBalance: 0,
      });
    }

    return result;
  }, [assetData]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Accounts</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) =>
            group.accounts.length > 0 ? (
              <AccountGroup key={group.type} group={group} />
            ) : (
              <div
                key={group.type}
                className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-muted-foreground"
              >
                <span className="text-lg">{group.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{group.label}</p>
                  <p className="text-xs">
                    Add an investment account to track your portfolio.
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
