"use client";

import { CircleCheck } from "lucide-react";
import { useUpcomingBills } from "@/hooks/use-upcoming-bills";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSAR } from "@/lib/format";
import { cn } from "@/lib/utils";

function dueBadge(daysUntilDue: number) {
  if (daysUntilDue <= 0) {
    return { label: daysUntilDue === 0 ? "Due today" : "Overdue", variant: "destructive" as const };
  }
  if (daysUntilDue <= 3) {
    return { label: `in ${daysUntilDue}d`, variant: "outline" as const };
  }
  return { label: `in ${daysUntilDue}d`, variant: "secondary" as const };
}

export function UpcomingBills() {
  const { data, isLoading } = useUpcomingBills();

  return (
    <Card className="transition-all duration-200 hover:-translate-y-px hover:shadow-md">
      <CardHeader>
        <CardTitle>Upcoming Bills</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <CircleCheck className="size-10 text-emerald-500 opacity-80" />
            <p className="text-sm font-medium">No bills coming up.</p>
            <p className="text-xs">You&apos;re all caught up — nicely done!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px] overflow-y-auto">
            <div className="space-y-1">
              {data.map((bill) => {
                const badge = dueBadge(bill.daysUntilDue);
                return (
                  <div
                    key={bill.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2.5",
                      bill.daysUntilDue <= 0 && "bg-red-50 dark:bg-red-950/20",
                      bill.daysUntilDue > 0 &&
                        bill.daysUntilDue <= 3 &&
                        "bg-yellow-50 dark:bg-yellow-950/20"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{bill.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSAR(bill.amount)}
                      </p>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
