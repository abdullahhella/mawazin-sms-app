"use client";

import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="relative min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Main content area */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[margin-left] duration-200",
          "md:ml-60",
          collapsed && "md:ml-16"
        )}
      >
        <Header />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
