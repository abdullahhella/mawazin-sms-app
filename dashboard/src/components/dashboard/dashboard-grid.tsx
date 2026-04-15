"use client";

import { useState } from "react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";
import { cn } from "@/lib/utils";

/**
 * 12-column CSS grid. Each widget is positioned by its (x, y, w, h) cells.
 * When not using absolute positioning we rely on document flow — widgets
 * flow left-to-right, breaking to new rows when they don't fit. This is
 * the lightest implementation that still supports resize + reorder
 * without a drag-drop library.
 *
 * Row height is determined by the widget's `h` (multiplied by ROW_PX).
 */

const ROW_PX = 90;

export function DashboardGrid() {
  const widgets = useDashboardStore((s) => s.widgets);
  const editMode = useDashboardStore((s) => s.editMode);
  const reorderWidget = useDashboardStore((s) => s.reorderWidget);
  const moveWidgetToPosition = useDashboardStore((s) => s.moveWidgetToPosition);

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const ids = widgets.map((w) => w.id);
    const fromIdx = ids.indexOf(draggingId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggingId(null);
      return;
    }
    moveWidgetToPosition(draggingId, toIdx);
    setDraggingId(null);
  };

  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-4",
        editMode && "py-3"
      )}
    >
      {widgets.map((w) => (
        <div
          key={w.id}
          style={{
            gridColumn: `span ${Math.max(1, Math.min(12, w.w))}`,
            minHeight: `${w.h * ROW_PX}px`,
          }}
          className="min-w-0"
        >
          <WidgetShell
            widget={w}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            draggingId={draggingId}
          >
            <WidgetRenderer widget={w} />
          </WidgetShell>
        </div>
      ))}
    </div>
  );
}
