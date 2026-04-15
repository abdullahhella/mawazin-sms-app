"use client";

import Link from "next/link";
import { Bot as BotIcon, CircleCheck, ExternalLink, Cpu, Users, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const HEALTH = [
  { label: "Bot process",     status: "online",  detail: "uptime 3d 4h" },
  { label: "LLM endpoint",    status: "online",  detail: "192.168.9.55:30068" },
  { label: "Whisper endpoint",status: "online",  detail: "192.168.9.55:30069" },
  { label: "Firefly III",     status: "online",  detail: "last ok 12s ago" },
];

interface Conversation {
  id: string;
  user: string;
  userMsg: string;
  interpretation: string;
  txnId: string;
  amount: string;
  when: string;
  confidence: number;
}

const CONVERSATIONS: Conversation[] = [
  { id: "c1",  user: "Ahmed",  userMsg: "spent 185 at panda",                     interpretation: "Withdrawal 185 SAR → Panda Supermarket (Groceries)",      txnId: "t2",  amount: "SAR 185.40", when: "2m ago",  confidence: 0.96 },
  { id: "c2",  user: "Ahmed",  userMsg: "gave sara 200 for lunch",                interpretation: "Transfer 200 SAR → person:sara (Dining)",                 txnId: "t45", amount: "SAR 200.00", when: "14m ago", confidence: 0.88 },
  { id: "c3",  user: "Noura",  userMsg: "🎙 voice 00:07 — Careem ride to office",  interpretation: "Withdrawal 55 SAR → Careem (Transport)",                  txnId: "t3",  amount: "SAR 55.00",  when: "38m ago", confidence: 0.92 },
  { id: "c4",  user: "Ahmed",  userMsg: "received 1200 from freelance client",    interpretation: "Deposit 1200 SAR ← Freelance (Income)",                   txnId: "t18", amount: "SAR 1,200.00", when: "2h ago", confidence: 0.94 },
  { id: "c5",  user: "Ahmed",  userMsg: "tamimi 230",                             interpretation: "Withdrawal 230 SAR → Tamimi Markets (Groceries)",         txnId: "t10", amount: "SAR 230.75", when: "5h ago",  confidence: 0.82 },
  { id: "c6",  user: "Ahmed",  userMsg: "coffee 28",                              interpretation: "Withdrawal 28 SAR → Dr.Cafe (Dining)",                    txnId: "t1",  amount: "SAR 28.00",  when: "yesterday", confidence: 0.9 },
  { id: "c7",  user: "Noura",  userMsg: "amazon 67 usb cables",                   interpretation: "Withdrawal 67 SAR → Amazon.sa (Shopping)",                txnId: "t9",  amount: "SAR 67.00",  when: "yesterday", confidence: 0.87 },
  { id: "c8",  user: "Ahmed",  userMsg: "🎙 voice 00:03 — nahdi pharmacy 156",     interpretation: "Withdrawal 156 SAR → Nahdi (Health)",                     txnId: "t14", amount: "SAR 156.00", when: "yesterday", confidence: 0.95 },
  { id: "c9",  user: "Ahmed",  userMsg: "stc 620",                                interpretation: "Withdrawal 620 SAR → STC (Bills)",                        txnId: "t5",  amount: "SAR 620.00", when: "2d ago", confidence: 0.97 },
  { id: "c10", user: "Ahmed",  userMsg: "transfer 2000 to savings",               interpretation: "Transfer 2000 SAR → SNB Savings",                         txnId: "t11", amount: "SAR 2,000.00", when: "2d ago", confidence: 0.99 },
  { id: "c11", user: "Noura",  userMsg: "talabat dinner 89.5",                    interpretation: "Withdrawal 89.50 SAR → Talabat (Dining)",                 txnId: "t6",  amount: "SAR 89.50",  when: "3d ago", confidence: 0.93 },
  { id: "c12", user: "Ahmed",  userMsg: "mortgage 1850",                          interpretation: "Transfer 1850 SAR → Home Mortgage (Housing)",             txnId: "t20", amount: "SAR 1,850.00", when: "3d ago", confidence: 0.98 },
];

const ALLOWED_USERS = [
  { name: "Ahmed",  telegramId: "12345678", role: "owner" },
  { name: "Noura",  telegramId: "98765432", role: "member" },
  { name: "Family", telegramId: "44556677", role: "member" },
];

const CONFIG = [
  { label: "LLM model",            value: "llama3.2:latest" },
  { label: "LLM base URL",         value: "http://192.168.9.55:30068/v1" },
  { label: "Whisper model",        value: "whisper-large-v3-turbo" },
  { label: "Whisper base URL",     value: "http://192.168.9.55:30069" },
  { label: "Confidence threshold", value: "0.80" },
  { label: "Auto-execute ≥ threshold", value: "yes" },
];

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
    />
  );
}

export default function BotPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BotIcon className="size-6" /> Telegram Bot
        </h1>
        <p className="text-sm text-muted-foreground">Observe intake, health, and recent conversations.</p>
      </div>

      {/* Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheck className="size-4 text-emerald-500" />
            Bot online
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HEALTH.map((h) => (
              <div key={h.label} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <StatusDot ok={h.status === "online"} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{h.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{h.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Conversations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {CONVERSATIONS.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{c.user}:</span>{" "}
                        <span className="text-muted-foreground">{c.userMsg}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-foreground">
                        → {c.interpretation}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-sm font-medium tabular-nums">{c.amount}</span>
                      <span className="text-[11px] text-muted-foreground">{c.when}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="secondary" className="gap-1">
                      confidence {Math.round(c.confidence * 100)}%
                    </Badge>
                    <Link
                      href={`/accounts/1?tx=${c.txnId}`}
                      className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                    >
                      View Firefly txn <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Sidebar: users + config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                Allowed users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {ALLOWED_USERS.map((u) => (
                  <li key={u.telegramId} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{u.telegramId}</p>
                    </div>
                    <Badge variant="secondary">{u.role}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="size-4" />
                Config
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {CONFIG.map((c) => (
                  <div key={c.label} className="flex items-baseline justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                    <dt className="text-xs text-muted-foreground">{c.label}</dt>
                    <dd className="truncate font-mono text-xs">{c.value}</dd>
                  </div>
                ))}
              </dl>
              <Separator className="my-3" />
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Lock className="size-3 mt-0.5 shrink-0" />
                Change via TrueNAS env vars.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
