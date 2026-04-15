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
  Inbox,
  Bot,
  Upload,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  PieChart,
  BarChart3,
  Settings,
  Inbox,
  Bot,
  Upload,
};

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleCollapsed);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-background transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight">
              &#1605;&#1610;&#1586;&#1575;&#1606;
            </span>
            <span className="text-[10px] text-muted-foreground">Mawazin</span>
          </div>
        )}
        {collapsed && (
          <span className="mx-auto text-lg font-semibold">
            &#1605;
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            const linkContent = (
              <Link
                href={item.enabled ? item.href : "#"}
                aria-disabled={!item.enabled}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  !item.enabled && "pointer-events-none opacity-50",
                  collapsed && "justify-center px-2"
                )}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                )}
                {Icon && <Icon className="size-4 shrink-0" />}
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {!item.enabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        Soon
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );

            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger className="w-full">
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label}
                      {!item.enabled && " (Soon)"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          className="w-full"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
