"use client";

import { useState, useMemo } from "react";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  HandCoins,
  CreditCard,
  PiggyBank,
  TrendingUp,
  BarChart3,
  PieChart,
  Scale,
  CalendarClock,
  Receipt,
  ListOrdered,
  Bell,
  Inbox,
  Hash,
  Activity,
  Heading,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WIDGET_CATALOG,
  CATEGORY_ORDER,
} from "@/lib/widgets/registry";
import type { WidgetDefinition, WidgetCategory } from "@/lib/widgets/types";
import { useDashboardStore } from "@/stores/dashboard-store";

const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  HandCoins,
  CreditCard,
  PiggyBank,
  TrendingUp,
  BarChart3,
  PieChart,
  Scale,
  CalendarClock,
  Receipt,
  ListOrdered,
  Bell,
  Inbox,
  Hash,
  Activity,
  Heading,
};

export function AddWidgetDialog({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<WidgetCategory | "All">(
    "All"
  );
  const addWidget = useDashboardStore((s) => s.addWidget);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return WIDGET_CATALOG;
    return WIDGET_CATALOG.filter((w) => w.category === activeCategory);
  }, [activeCategory]);

  const handleAdd = (def: WidgetDefinition) => {
    addWidget(def.type);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className={triggerClassName}>
          <Plus className="mr-1 size-4" />
          Add widget
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b bg-muted/30 p-6">
          <SheetTitle>Add a widget</SheetTitle>
          <SheetDescription>
            Pick something to drop onto your dashboard. You can resize and
            rearrange after.
          </SheetDescription>
        </SheetHeader>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5 border-b bg-background p-3">
          <CategoryPill
            label="All"
            active={activeCategory === "All"}
            onClick={() => setActiveCategory("All")}
            count={WIDGET_CATALOG.length}
          />
          {CATEGORY_ORDER.map((cat) => {
            const count = WIDGET_CATALOG.filter((w) => w.category === cat)
              .length;
            return (
              <CategoryPill
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                count={count}
              />
            );
          })}
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            {filtered.map((def) => {
              const Icon = ICON_MAP[def.icon] ?? Hash;
              return (
                <button
                  key={def.type}
                  onClick={() => handleAdd(def)}
                  className="group text-left"
                  aria-label={`Add ${def.title} widget`}
                >
                  <Card
                    className={cn(
                      "relative h-full cursor-pointer overflow-hidden transition-all",
                      "hover:-translate-y-0.5 hover:shadow-md",
                      "ring-1 ring-border group-hover:ring-primary/40"
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.08] transition-opacity group-hover:opacity-[0.18]",
                        def.previewAccent ?? "from-slate-400 to-slate-500"
                      )}
                      aria-hidden
                    />
                    <CardContent className="relative flex h-full flex-col gap-2 py-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg bg-background/90 ring-1 ring-border"
                          )}
                        >
                          <Icon className="size-4 text-foreground" />
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase"
                        >
                          {def.category}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium leading-tight">
                          {def.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {def.description}
                        </p>
                      </div>
                      <div className="mt-auto pt-2 text-[10px] text-muted-foreground">
                        {def.defaultSize.w}×{def.defaultSize.h} default
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
          <div className="p-4 pt-0">
            <SheetClose asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </SheetClose>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px]",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}
