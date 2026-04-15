"use client";

import {
  AlertTriangle,
  Info,
  AlertCircle,
  X,
  PartyPopper,
} from "lucide-react";
import { useAlerts } from "@/hooks/use-alerts";
import { useAlertsStore } from "@/stores/alerts-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AlertItem } from "@/types/app";

const severityConfig: Record<
  AlertItem["severity"],
  { icon: typeof Info; bg: string; text: string; border: string }
> = {
  critical: {
    icon: AlertCircle,
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-900",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-900",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900",
  },
};

export function AlertsInbox() {
  const { data, isLoading } = useAlerts();
  const { dismissedAlertIds, dismissAlert } = useAlertsStore();

  const visibleAlerts =
    data?.filter((a) => !dismissedAlertIds.includes(a.id)) ?? [];

  return (
    <Card className="transition-all duration-200 hover:-translate-y-px hover:shadow-md">
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !visibleAlerts.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <PartyPopper className="size-10 text-emerald-500 opacity-80" />
            <p className="text-sm font-medium">You&apos;re all caught up.</p>
            <p className="text-xs">No alerts right now — keep it up!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px] overflow-y-auto">
            <div className="space-y-2">
              {visibleAlerts.map((alert) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3",
                      config.bg,
                      config.border
                    )}
                  >
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.text)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.message}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      aria-label={`Dismiss alert: ${alert.title}`}
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
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
