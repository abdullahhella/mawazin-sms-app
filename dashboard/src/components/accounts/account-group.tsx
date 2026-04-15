"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AccountCard } from "@/components/accounts/account-card";
import { formatSAR } from "@/lib/format";
import type { AccountGroup as AccountGroupType } from "@/types/app";

interface AccountGroupProps {
  group: AccountGroupType;
}

export function AccountGroup({ group }: AccountGroupProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-lg">{group.icon}</span>
        <span className="text-sm font-semibold flex-1">{group.label}</span>
        <span className="text-xs text-muted-foreground">
          {group.accounts.length} account{group.accounts.length !== 1 ? "s" : ""}
        </span>
        <span className="text-sm font-semibold">{formatSAR(group.totalBalance)}</span>
      </button>

      {open && (
        <div className="ml-4 space-y-1">
          {group.accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
