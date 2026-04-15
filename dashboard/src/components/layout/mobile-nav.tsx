"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  PieChart,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  PieChart,
  BarChart3,
  Settings,
};

export function MobileNav() {
  const pathname = usePathname();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight">
                &#1605;&#1610;&#1586;&#1575;&#1606;
              </span>
              <span className="text-[10px] text-muted-foreground">
                Mawazin
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="px-2 py-3">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.enabled ? item.href : "#"}
                    aria-disabled={!item.enabled}
                    onClick={() => {
                      if (item.enabled) setSidebarOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      !item.enabled && "pointer-events-none opacity-50"
                    )}
                  >
                    {Icon && <Icon className="size-4 shrink-0" />}
                    <span className="flex-1">{item.label}</span>
                    {!item.enabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        Soon
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
