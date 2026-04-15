"use client";

import { useState } from "react";
import {
  Pencil,
  Check,
  Save,
  RotateCcw,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { AddWidgetDialog } from "@/components/dashboard/add-widget-dialog";
import { useDashboardStore } from "@/stores/dashboard-store";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const editMode = useDashboardStore((s) => s.editMode);
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const resetToDefault = useDashboardStore((s) => s.resetToDefault);
  const saveLayout = useDashboardStore((s) => s.saveLayout);
  const loadLayout = useDashboardStore((s) => s.loadLayout);
  const deleteLayout = useDashboardStore((s) => s.deleteLayout);
  const namedLayouts = useDashboardStore((s) => s.namedLayouts);
  const activeLayoutName = useDashboardStore((s) => s.activeLayoutName);

  const [savingName, setSavingName] = useState("");

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <span className="hidden items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
            <Sparkles className="size-3" />
            {activeLayoutName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Layouts menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Layouts
                <ChevronDown className="ml-1 size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Switch layout</DropdownMenuLabel>
              {Object.keys(namedLayouts).length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No saved layouts yet
                </div>
              ) : (
                Object.keys(namedLayouts).map((name) => (
                  <DropdownMenuItem
                    key={name}
                    onClick={() => loadLayout(name)}
                  >
                    <span className="flex-1 truncate">{name}</span>
                    {name === activeLayoutName && (
                      <Check className="ml-2 size-3" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <div className="p-2">
                <div className="flex gap-1">
                  <input
                    value={savingName}
                    onChange={(e) => setSavingName(e.target.value)}
                    placeholder="New layout name"
                    className="flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (savingName.trim()) {
                        saveLayout(savingName.trim());
                        setSavingName("");
                      }
                    }}
                  >
                    <Save className="size-3.5" />
                  </Button>
                </div>
              </div>
              {Object.keys(namedLayouts).length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Delete saved
                  </DropdownMenuLabel>
                  {Object.keys(namedLayouts).map((name) => (
                    <DropdownMenuItem
                      key={`del-${name}`}
                      onClick={() => deleteLayout(name)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete &quot;{name}&quot;
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {editMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
                className="text-muted-foreground"
              >
                <RotateCcw className="mr-1 size-3.5" />
                Reset
              </Button>
              <AddWidgetDialog />
            </>
          )}

          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={toggleEditMode}
            className={cn(editMode && "shadow-sm")}
          >
            {editMode ? (
              <>
                <Check className="mr-1 size-3.5" />
                Done
              </>
            ) : (
              <>
                <Pencil className="mr-1 size-3.5" />
                Edit
              </>
            )}
          </Button>
        </div>
      </div>

      {editMode && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-sm text-muted-foreground">
          <strong className="text-foreground">Edit mode.</strong> Hover any
          widget to resize, change chart type, reorder, or remove it. Click
          &quot;Add widget&quot; to drop in a new one. Changes save automatically
          to your browser.
        </div>
      )}

      <DashboardGrid />
    </div>
  );
}
