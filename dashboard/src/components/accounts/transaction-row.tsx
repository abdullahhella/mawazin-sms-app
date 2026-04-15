"use client";

import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Bot,
  MessageSquare,
  Smartphone,
  LayoutDashboard,
  HelpCircle,
  type LucideProps,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { formatSAR, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getOrigin, ORIGIN_META, type TransactionOrigin } from "@/lib/transaction-origin";
import type { FlatTransaction } from "@/types/app";
import type { ComponentType } from "react";

interface TransactionRowProps {
  transaction: FlatTransaction;
  expanded?: boolean;
  onToggle?: () => void;
}

const typeConfig = {
  withdrawal: {
    icon: ArrowUpRight,
    color: "text-red-600 dark:text-red-400",
    sign: "-",
  },
  deposit: {
    icon: ArrowDownLeft,
    color: "text-emerald-600 dark:text-emerald-400",
    sign: "+",
  },
  transfer: {
    icon: ArrowLeftRight,
    color: "text-blue-600 dark:text-blue-400",
    sign: "",
  },
} as const;

// Map icon names from ORIGIN_META to actual lucide components
const ORIGIN_ICONS: Record<TransactionOrigin, ComponentType<LucideProps>> = {
  bot:       Bot,
  sms:       MessageSquare,
  ios:       Smartphone,
  dashboard: LayoutDashboard,
  unknown:   HelpCircle,
};

function OriginBadge({ tags }: { tags: string[] | undefined }) {
  const origin = getOrigin(tags);
  const meta = ORIGIN_META[origin];
  const OriginIcon = ORIGIN_ICONS[origin];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            className={cn(
              "h-5 w-5 cursor-default rounded-full border p-0 shrink-0",
              meta.colorClass
            )}
            aria-label={meta.label}
          >
            <OriginIcon className="h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{meta.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TransactionRow({
  transaction: t,
  expanded,
  onToggle,
}: TransactionRowProps) {
  const config = typeConfig[t.type] ?? typeConfig.withdrawal;
  const Icon = config.icon;
  const showToggle = t.isSplit && t.splitIndex === 0 && onToggle;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        showToggle && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={showToggle ? onToggle : undefined}
    >
      {showToggle ? (
        expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )
      ) : (
        <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{t.description}</p>
          {t.isSplit && t.splitIndex === 0 && (
            <Badge variant="secondary">
              {t.splitCount} splits
            </Badge>
          )}
          <OriginBadge tags={t.tags} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDateShort(t.date)}</span>
          {t.categoryName && (
            <>
              <span>&middot;</span>
              <Badge variant="secondary">{t.categoryName}</Badge>
            </>
          )}
        </div>
      </div>

      <p className={cn("text-sm font-semibold shrink-0", config.color)}>
        {config.sign}
        {formatSAR(t.amount)}
      </p>
    </div>
  );
}
