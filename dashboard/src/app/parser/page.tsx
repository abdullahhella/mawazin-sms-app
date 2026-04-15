"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Inbox, Clock, CheckCircle2, CreditCard, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useParserPending } from "@/hooks/use-parser-pending";
import { useParserRuns } from "@/hooks/use-parser-runs";
import { useParserCards } from "@/hooks/use-parser-cards";
import { useParserAccounts } from "@/hooks/use-parser-accounts";
import type { ParserCard } from "@/lib/mock-fixtures";

// ── UI helpers ──────────────────────────────────────────────────────
type SmsStatus = "pending" | "parsed" | "failed" | "duplicate";

function ParsedBadge({ status }: { status: SmsStatus }) {
  const variants: Record<SmsStatus, string> = {
    parsed:    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    pending:   "bg-amber-500/10  text-amber-700  dark:text-amber-400",
    duplicate: "bg-sky-500/10    text-sky-700    dark:text-sky-400",
    failed:    "bg-red-500/10    text-red-700    dark:text-red-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium", variants[status])}>
      {status}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.9 ? "bg-emerald-500" : value >= 0.7 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(diff / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// ── Page ────────────────────────────────────────────────────────────
export default function ParserPage() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: pending, isLoading: pendingLoading } = useParserPending();
  const { data: runs, isLoading: runsLoading } = useParserRuns();
  const { data: cards, isLoading: cardsLoading } = useParserCards();
  const { data: accounts, isLoading: accountsLoading } = useParserAccounts();

  // ── Computed stats ──────────────────────────────────────────────
  const pendingCount = pending?.filter((s) => s.status === "pending").length ?? 0;

  const lastBatchTime = runs?.[0]?.created_at
    ? formatRelativeTime(runs[0].created_at)
    : "—";

  const batchIntervalHours = process.env.NEXT_PUBLIC_BATCH_INTERVAL_HOURS
    ? Number(process.env.NEXT_PUBLIC_BATCH_INTERVAL_HOURS)
    : null;

  let nextBatchLabel = "—";
  if (batchIntervalHours !== null && runs?.[0]?.created_at) {
    const next = new Date(new Date(runs[0].created_at).getTime() + batchIntervalHours * 3_600_000);
    const diffMins = Math.round((next.getTime() - Date.now()) / 60_000);
    if (diffMins > 0) {
      nextBatchLabel = diffMins < 60 ? `in ${diffMins}m` : `in ${Math.round(diffMins / 60)}h`;
    } else {
      nextBatchLabel = "overdue";
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const createdToday = runs
    ? runs
        .filter((r) => r.created_at.slice(0, 10) === todayStr)
        .reduce((sum, r) => sum + r.created, 0)
    : 0;

  const stats = [
    { label: "Pending in queue", value: pendingLoading ? "…" : String(pendingCount), icon: Inbox,        tone: "text-foreground" },
    { label: "Last batch",       value: runsLoading    ? "…" : lastBatchTime,         icon: Clock,        tone: "text-muted-foreground" },
    { label: "Next batch",       value: runsLoading    ? "…" : nextBatchLabel,         icon: Clock,        tone: "text-muted-foreground" },
    { label: "Created today",    value: runsLoading    ? "…" : String(createdToday),   icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400" },
  ];

  // ── Run batch ───────────────────────────────────────────────────
  const runBatch = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/parser/process", { method: "POST" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        alert(`Batch failed: ${err.error ?? res.statusText}`);
        return;
      }
      const stats = (await res.json()) as {
        received: number;
        created: number;
        duplicates: number;
        failed: number;
      };
      alert(
        `Batch complete — received: ${stats.received}, created: ${stats.created}, duplicates: ${stats.duplicates}, failed: ${stats.failed}`,
      );
      await queryClient.invalidateQueries({ queryKey: ["parser-pending"] });
      await queryClient.invalidateQueries({ queryKey: ["parser-runs"] });
    } catch (e) {
      alert(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  // ── Update card mapping ─────────────────────────────────────────
  const updateMapping = async (card: ParserCard, accountId: string) => {
    const account = accounts?.find((a) => a.id === accountId);
    const body = {
      firefly_account_id: accountId,
      firefly_account_name: account?.name ?? "",
    };

    const encodedFragment = encodeURIComponent(card.fragment);
    try {
      const res = await fetch(`/api/parser/cards/${encodedFragment}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        alert(`Could not save mapping: ${err.error ?? res.statusText}`);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["parser-cards"] });
    } catch (e) {
      alert(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">SMS Parser</h1>
          <p className="text-sm text-muted-foreground">
            Inbound bank SMS queue, parser runs, and card → account mapping.
          </p>
        </div>
        <Button onClick={runBatch} disabled={running}>
          <Play className="size-4" />
          {running ? "Running..." : "Run Batch Now"}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <s.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn("text-lg font-semibold truncate", s.tone)}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="mapping">Card Mapping</TabsTrigger>
        </TabsList>

        {/* Queue */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Pending &amp; recent SMS</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <TableSkeleton rows={6} cols={7} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Bank</th>
                        <th className="px-2 py-2 font-medium">Snippet</th>
                        <th className="px-2 py-2 font-medium">Received</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Card</th>
                        <th className="px-2 py-2 font-medium text-right">Amount</th>
                        <th className="px-2 py-2 font-medium">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pending ?? []).map((q) => (
                        <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-2 py-2 font-medium">{q.bank}</td>
                          <td className="px-2 py-2 max-w-[360px] truncate text-muted-foreground">{q.snippet}</td>
                          <td className="px-2 py-2 text-muted-foreground">{formatRelativeTime(q.received_at)}</td>
                          <td className="px-2 py-2"><ParsedBadge status={q.status} /></td>
                          <td className="px-2 py-2 font-mono text-xs">{q.card_fragment ?? "—"}</td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {q.amount !== null ? formatSAR(q.amount) : "—"}
                          </td>
                          <td className="px-2 py-2">
                            {q.confidence !== null ? (
                              <ConfidenceBar value={q.confidence} />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Runs */}
        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle>Recent batch runs</CardTitle>
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Timestamp</th>
                        <th className="px-2 py-2 font-medium text-right">Received</th>
                        <th className="px-2 py-2 font-medium text-right">Parsed</th>
                        <th className="px-2 py-2 font-medium text-right">Created</th>
                        <th className="px-2 py-2 font-medium text-right">Duplicates</th>
                        <th className="px-2 py-2 font-medium text-right">Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(runs ?? []).map((r) => (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-2 py-2">{formatRelativeTime(r.created_at)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.received}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.parsed}</td>
                          <td className="px-2 py-2 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{r.created}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{r.duplicates}</td>
                          <td className={cn("px-2 py-2 text-right tabular-nums", r.failed > 0 && "text-red-600 dark:text-red-400")}>{r.failed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Card Mapping */}
        <TabsContent value="mapping">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" />
                Detected card fragments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cardsLoading || accountsLoading ? (
                <TableSkeleton rows={8} cols={5} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Fragment</th>
                        <th className="px-2 py-2 font-medium">Bank</th>
                        <th className="px-2 py-2 font-medium text-right">Occurrences</th>
                        <th className="px-2 py-2 font-medium">Mapped account</th>
                        <th className="px-2 py-2 font-medium text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cards ?? []).map((m) => (
                        <CardMappingRow
                          key={m.fragment}
                          card={m}
                          accounts={accounts ?? []}
                          onSave={updateMapping}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Isolated row component with local pending state so the select feels immediate
function CardMappingRow({
  card,
  accounts,
  onSave,
}: {
  card: ParserCard;
  accounts: { id: string; name: string; type: string }[];
  onSave: (card: ParserCard, accountId: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [localAccountId, setLocalAccountId] = useState<string>(
    card.firefly_account_id ?? "",
  );

  const handleChange = async (accountId: string) => {
    setLocalAccountId(accountId);
    setSaving(true);
    await onSave(card, accountId);
    setSaving(false);
  };

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-2 py-2 font-mono">{card.fragment}</td>
      <td className="px-2 py-2">{card.bank}</td>
      <td className="px-2 py-2 text-right tabular-nums">{card.occurrences}</td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <select
            value={localAccountId}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
          >
            <option value="">— Select account —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {!localAccountId && (
            <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3" /> Unmapped
            </Badge>
          )}
          {saving && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
        </div>
      </td>
      <td className="px-2 py-2 text-right text-xs text-muted-foreground">
        {localAccountId
          ? accounts.find((a) => a.id === localAccountId)?.name ?? ""
          : ""}
      </td>
    </tr>
  );
}
