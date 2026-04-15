"use client";

import { useState, useMemo } from "react";
import { Search, ListFilter } from "lucide-react";
import { TransactionRow } from "@/components/accounts/transaction-row";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FireflyTransactionGroup } from "@/types/firefly";
import type { FlatTransaction } from "@/types/app";
import { getOrigin, type TransactionOrigin } from "@/lib/transaction-origin";

interface TransactionListProps {
  transactions: FireflyTransactionGroup[];
}

type TypeFilter = "all" | "withdrawal" | "deposit" | "transfer";
type SourceFilter = "all" | TransactionOrigin;

const SOURCE_FILTER_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all",       label: "All sources" },
  { value: "sms",       label: "SMS" },
  { value: "bot",       label: "Bot" },
  { value: "ios",       label: "iOS" },
  { value: "dashboard", label: "Dashboard" },
  { value: "unknown",   label: "Unknown" },
];

function flattenTransactions(
  groups: FireflyTransactionGroup[]
): FlatTransaction[] {
  const result: FlatTransaction[] = [];
  for (const group of groups) {
    const splits = group.attributes.transactions;
    const isSplit = splits.length > 1;
    splits.forEach((split, index) => {
      const tags = (split.tags ?? []).map((t) =>
        typeof t === "string" ? t : t.tag
      );
      result.push({
        id: `${group.id}-${index}`,
        groupId: group.id,
        groupTitle: group.attributes.group_title,
        type: split.type,
        date: split.date,
        amount: parseFloat(split.amount),
        description: split.description,
        categoryName: split.category_name,
        sourceName: split.source_name,
        destinationName: split.destination_name,
        tags,
        currencyCode: split.currency_code,
        splitCount: splits.length,
        splitIndex: index,
        source: getOrigin(tags),
        isSplit,
      });
    });
  }
  return result;
}

export function TransactionList({ transactions }: TransactionListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const flat = useMemo(() => flattenTransactions(transactions), [transactions]);

  const filtered = useMemo(() => {
    let items = flat;
    if (typeFilter !== "all") {
      items = items.filter((t) => t.type === typeFilter);
    }
    if (sourceFilter !== "all") {
      items = items.filter((t) => t.source === sourceFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((t) => t.description.toLowerCase().includes(q));
    }
    return items;
  }, [flat, typeFilter, sourceFilter, search]);

  // For split groups, only show the first split unless expanded
  const visible = useMemo(() => {
    return filtered.filter((t) => {
      if (!t.isSplit) return true;
      if (t.splitIndex === 0) return true;
      return expandedGroups.has(t.groupId);
    });
  }, [filtered, expandedGroups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Source filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
          className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter by source"
        >
          {SOURCE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <Tabs
          defaultValue="all"
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
            <TabsTrigger value="deposit">Deposits</TabsTrigger>
            <TabsTrigger value="transfer">Transfers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <ListFilter className="size-10 opacity-40" />
          <p className="text-sm font-medium">No transactions found.</p>
          <p className="text-xs">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[500px] overflow-y-auto">
          <div className="space-y-0.5">
            {visible.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                expanded={expandedGroups.has(t.groupId)}
                onToggle={
                  t.isSplit && t.splitIndex === 0
                    ? () => toggleGroup(t.groupId)
                    : undefined
                }
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
