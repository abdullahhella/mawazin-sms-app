"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { Sun, Moon, RefreshCw, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);
}

function useDateLabel() {
  return useMemo(() => {
    return new Date().toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }, []);
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const greeting = useGreeting();
  const dateLabel = useDateLabel();

  function handleRefresh() {
    queryClient.invalidateQueries();
  }

  function handleToggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      {/* Left: mobile menu + greeting */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold">Mawazin</h1>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            {greeting} &middot; {dateLabel}
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={handleRefresh} aria-label="Refresh data" className="focus-visible:ring-2 focus-visible:ring-primary">
          <RefreshCw className="size-4" />
          <span className="sr-only">Refresh data</span>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleToggleTheme} aria-label="Toggle theme" className="focus-visible:ring-2 focus-visible:ring-primary">
          <Sun className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
