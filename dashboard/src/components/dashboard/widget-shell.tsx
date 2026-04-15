"use client";

import { useState } from "react";
import {
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  GripVertical,
  Settings2,
  LineChart,
  AreaChart,
  BarChart3,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard-store";
import { getWidgetDefinition } from "@/lib/widgets/registry";
import type { WidgetInstance, ChartType } from "@/lib/widgets/types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface WidgetShellProps {
  widget: WidgetInstance;
  children: React.ReactNode;
  onDragStart?: (id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (id: string) => void;
  draggingId?: string | null;
}

const CHART_ICON: Record<ChartType, typeof LineChart> = {
  line: LineChart,
  area: AreaChart,
  bar: BarChart3,
  pie: PieChart,
};

const CHART_LABEL: Record<ChartType, string> = {
  line: "Line",
  area: "Area",
  bar: "Bar",
  pie: "Pie",
};

export function WidgetShell({
  widget,
  children,
  onDragStart,
  onDragOver,
  onDrop,
  draggingId,
}: WidgetShellProps) {
  const editMode = useDashboardStore((s) => s.editMode);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const resizeWidget = useDashboardStore((s) => s.resizeWidget);
  const updateConfig = useDashboardStore((s) => s.updateConfig);
  const reorderWidget = useDashboardStore((s) => s.reorderWidget);
  const [hovering, setHovering] = useState(false);

  const def = getWidgetDefinition(widget.type);
  const isBeingDragged = draggingId === widget.id;

  const cycleWidth = (dir: 1 | -1) => {
    if (!def) return;
    const step = Math.max(1, Math.floor(def.maxSize.w / 4));
    resizeWidget(widget.id, widget.w + dir * step, widget.h);
  };

  const cycleHeight = (dir: 1 | -1) => {
    if (!def) return;
    resizeWidget(widget.id, widget.w, widget.h + dir);
  };

  const setChartType = (t: ChartType) => {
    updateConfig(widget.id, { chartType: t });
  };

  const supportedCharts = def?.supportsChartTypes ?? [];
  const currentChart = widget.config?.chartType;

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onDragOver={editMode ? onDragOver : undefined}
      onDrop={editMode ? (e) => { e.preventDefault(); onDrop?.(widget.id); } : undefined}
      className={cn(
        "relative h-full transition-all",
        editMode && "rounded-xl ring-2 ring-dashed ring-border/60 ring-offset-2 ring-offset-background",
        editMode && hovering && "ring-primary/60",
        isBeingDragged && "opacity-40 scale-[0.98]"
      )}
    >
      {editMode && (
        <div className="pointer-events-none absolute inset-x-0 -top-2 z-30 flex items-center justify-between gap-1 px-2">
          <div
            draggable
            onDragStart={() => onDragStart?.(widget.id)}
            className="pointer-events-auto flex cursor-grab items-center gap-1 rounded-md bg-foreground text-background px-2 py-0.5 text-[11px] shadow-md hover:opacity-90 active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="size-3" />
            <span className="max-w-[120px] truncate">{def?.title ?? widget.type}</span>
          </div>

          <div className="pointer-events-auto flex items-center gap-0.5 rounded-md bg-background p-0.5 shadow-md ring-1 ring-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => reorderWidget(widget.id, "up")}
                  aria-label="Move up"
                >
                  <ChevronUp className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move up</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => reorderWidget(widget.id, "down")}
                  aria-label="Move down"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move down</TooltipContent>
            </Tooltip>

            <div className="mx-0.5 h-4 w-px bg-border" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => cycleWidth(-1)}
                  aria-label="Shrink width"
                >
                  <Minimize2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Shrink width</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => cycleWidth(1)}
                  aria-label="Expand width"
                >
                  <Maximize2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expand width</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Widget settings">
                  <Settings2 className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {supportedCharts.length > 0 && (
                  <>
                    <DropdownMenuLabel>Chart type</DropdownMenuLabel>
                    {supportedCharts.map((ct) => {
                      const Icon = CHART_ICON[ct];
                      return (
                        <DropdownMenuItem
                          key={ct}
                          onClick={() => setChartType(ct)}
                        >
                          <Icon className="mr-2 size-4" />
                          {CHART_LABEL[ct]}
                          {currentChart === ct && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              ✓
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuLabel>Height</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => cycleHeight(-1)}>
                  Decrease row
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => cycleHeight(1)}>
                  Increase row
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => removeWidget(widget.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <X className="mr-2 size-4" />
                  Remove widget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <div className="h-full">{children}</div>
    </div>
  );
}
