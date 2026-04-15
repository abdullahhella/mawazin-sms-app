"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PendingIntakeItem {
  id: string;
  rawText: string;
  parsedIntent: string;
  confidence: number;
  createdAt: string;
  status: "pending-review";
}

type FetchState =
  | { status: "loading" }
  | { status: "offline" }
  | { status: "empty" }
  | { status: "loaded"; items: PendingIntakeItem[] };

export function NeedsContextWidget() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/intake/pending")
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setState({ status: "offline" });
          return;
        }
        const json = (await res.json()) as { data: PendingIntakeItem[] };
        if (cancelled) return;
        if (!json.data?.length) {
          setState({ status: "empty" });
        } else {
          setState({ status: "loaded", items: json.data });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "offline" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (state.status === "offline") {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Transactions needing context</p>
            <p className="text-xs text-muted-foreground">
              Pending queue is offline.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.status === "empty") {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Transactions needing context</p>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                0
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Nothing pending — nicely done! Voice &amp; SMS intake coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { items } = state;
  const preview = items.slice(0, 3);

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Transactions needing context</p>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                {items.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Review these before they are auto-categorised.
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {preview.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium" title={item.rawText}>
                  {item.rawText.length > 60
                    ? item.rawText.slice(0, 60) + "…"
                    : item.rawText}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.parsedIntent}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {Math.round(item.confidence * 100)}% conf.
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-6 shrink-0 px-2 text-xs"
                onClick={() => {
                  /* placeholder */
                }}
              >
                Review
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
