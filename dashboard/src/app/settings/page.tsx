"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Copy,
  Check,
  Server,
  Cpu,
  MessageSquare,
  Inbox,
  Palette,
  Sun,
  Moon,
  Monitor,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Field {
  label: string;
  value: string;
  mono?: boolean;
  masked?: boolean;
}

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  fields: Field[];
}

const SECTIONS: Section[] = [
  {
    id: "firefly",
    title: "Firefly Connection",
    icon: Server,
    fields: [
      { label: "URL",   value: "http://localhost:8080", mono: true },
      { label: "Token", value: "eyJ0xxxxxxxxxxxxxxxxxxxxxxxxxxQt9Hkc", mono: true, masked: true },
    ],
  },
  {
    id: "ai",
    title: "LLM / AI",
    icon: Cpu,
    fields: [
      { label: "Base URL", value: "http://192.168.9.55:30068/v1", mono: true },
      { label: "Model",    value: "llama3.2:latest",              mono: true },
      { label: "Whisper",  value: "whisper-large-v3-turbo",       mono: true },
    ],
  },
  {
    id: "telegram",
    title: "Telegram",
    icon: MessageSquare,
    fields: [
      { label: "Bot token", value: "7812xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxN8Ku", mono: true, masked: true },
      { label: "Chat ID",   value: "-1001234567890", mono: true },
    ],
  },
  {
    id: "parser",
    title: "SMS Parser",
    icon: Inbox,
    fields: [
      { label: "Batch interval", value: "4h",  mono: true },
      { label: "Dedup window",   value: "48h", mono: true },
      { label: "API key",        value: "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_a4f9", mono: true, masked: true },
    ],
  },
];

function FieldRow({ field }: { field: Field }) {
  const [copied, setCopied] = useState(false);
  const display = field.masked
    ? `${field.value.slice(0, 4)}${"•".repeat(Math.max(field.value.length - 10, 6))}${field.value.slice(-6)}`
    : field.value;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(field.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center gap-3 border-b py-2 last:border-0">
      <span className="w-36 shrink-0 text-xs text-muted-foreground">{field.label}</span>
      <code
        className={cn(
          "min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 text-xs",
          field.mono && "font-mono",
        )}
      >
        {display}
      </code>
      <Button size="icon-sm" variant="ghost" onClick={copy} aria-label={`Copy ${field.label}`}>
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const current = theme ?? resolvedTheme ?? "system";
  const options = [
    { value: "light",  label: "Light",  icon: Sun },
    { value: "dark",   label: "Dark",   icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div className="flex items-center gap-2">
      {options.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant={current === o.value ? "default" : "outline"}
          onClick={() => setTheme(o.value)}
        >
          <o.icon className="size-3.5" />
          {o.label}
        </Button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Current configuration. All values are read-only — edit via TrueNAS deployment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="size-4" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {section.fields.map((f) => (
                <FieldRow key={f.label} field={f} />
              ))}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-4" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 border-b py-2">
              <span className="w-36 shrink-0 text-xs text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        To change any of the above (except theme), edit the TrueNAS app YAML and redeploy.
      </p>
    </div>
  );
}
