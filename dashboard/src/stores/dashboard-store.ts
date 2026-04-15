/**
 * Dashboard layout store — persists the user's chosen widgets,
 * their positions, and their configs in localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WidgetInstance, WidgetType, WidgetConfig } from "@/lib/widgets/types";
import { getWidgetDefinition } from "@/lib/widgets/registry";

/** Default starter layout — shown to first-time users */
const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: "w-metric-nb", type: "metric-net-balance", x: 0, y: 0, w: 3, h: 1 },
  { id: "w-metric-ms", type: "metric-monthly-spending", x: 3, y: 0, w: 3, h: 1 },
  { id: "w-metric-mi", type: "metric-monthly-income", x: 6, y: 0, w: 3, h: 1 },
  { id: "w-metric-nl", type: "metric-net-lending", x: 9, y: 0, w: 3, h: 1 },
  { id: "w-chart-nw", type: "chart-net-worth", x: 0, y: 1, w: 6, h: 3, config: { chartType: "area", range: "6m" } },
  { id: "w-chart-cf", type: "chart-cash-flow", x: 6, y: 1, w: 6, h: 3, config: { chartType: "bar" } },
  { id: "w-list-ub", type: "list-upcoming-bills", x: 0, y: 4, w: 6, h: 3 },
  { id: "w-inbox-al", type: "inbox-alerts", x: 6, y: 4, w: 6, h: 3 },
  { id: "w-inbox-nc", type: "inbox-needs-context", x: 0, y: 7, w: 12, h: 2 },
];

interface DashboardState {
  widgets: WidgetInstance[];
  editMode: boolean;
  /** Layouts saved by name — allows users to keep alternatives */
  namedLayouts: Record<string, WidgetInstance[]>;
  /** The name of the currently active layout */
  activeLayoutName: string;

  // Actions
  toggleEditMode: () => void;
  setEditMode: (on: boolean) => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, w: number, h: number) => void;
  updateConfig: (id: string, config: Partial<WidgetConfig>) => void;
  reorderWidget: (id: string, direction: "up" | "down") => void;
  moveWidgetToPosition: (id: string, targetIndex: number) => void;
  resetToDefault: () => void;
  saveLayout: (name: string) => void;
  loadLayout: (name: string) => void;
  deleteLayout: (name: string) => void;
}

function nextId(existing: WidgetInstance[]): string {
  const base = `w-${Date.now().toString(36)}`;
  let i = 0;
  let id = base;
  const taken = new Set(existing.map((w) => w.id));
  while (taken.has(id)) {
    i += 1;
    id = `${base}-${i}`;
  }
  return id;
}

/** Find the next free Y row in the grid for a new widget spanning full width. */
function computeInsertY(widgets: WidgetInstance[]): number {
  if (widgets.length === 0) return 0;
  return Math.max(...widgets.map((w) => w.y + w.h));
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: DEFAULT_LAYOUT,
      editMode: false,
      namedLayouts: {},
      activeLayoutName: "Default",

      toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
      setEditMode: (on) => set({ editMode: on }),

      addWidget: (type) => {
        const def = getWidgetDefinition(type);
        if (!def) return;
        const widgets = get().widgets;
        const id = nextId(widgets);
        const newWidget: WidgetInstance = {
          id,
          type,
          x: 0,
          y: computeInsertY(widgets),
          w: def.defaultSize.w,
          h: def.defaultSize.h,
        };
        set({ widgets: [...widgets, newWidget] });
      },

      removeWidget: (id) =>
        set((s) => ({ widgets: s.widgets.filter((w) => w.id !== id) })),

      moveWidget: (id, x, y) =>
        set((s) => ({
          widgets: s.widgets.map((w) =>
            w.id === id
              ? { ...w, x: Math.max(0, Math.min(11, x)), y: Math.max(0, y) }
              : w
          ),
        })),

      resizeWidget: (id, w, h) =>
        set((s) => {
          const def = getWidgetDefinition(
            s.widgets.find((x) => x.id === id)?.type ?? ""
          );
          const min = def?.minSize ?? { w: 1, h: 1 };
          const max = def?.maxSize ?? { w: 12, h: 6 };
          return {
            widgets: s.widgets.map((widget) =>
              widget.id === id
                ? {
                    ...widget,
                    w: Math.max(min.w, Math.min(max.w, w)),
                    h: Math.max(min.h, Math.min(max.h, h)),
                  }
                : widget
            ),
          };
        }),

      updateConfig: (id, config) =>
        set((s) => ({
          widgets: s.widgets.map((w) =>
            w.id === id ? { ...w, config: { ...w.config, ...config } } : w
          ),
        })),

      reorderWidget: (id, direction) =>
        set((s) => {
          const idx = s.widgets.findIndex((w) => w.id === id);
          if (idx === -1) return s;
          const target = direction === "up" ? idx - 1 : idx + 1;
          if (target < 0 || target >= s.widgets.length) return s;
          const next = [...s.widgets];
          [next[idx], next[target]] = [next[target], next[idx]];
          return { widgets: next };
        }),

      moveWidgetToPosition: (id, targetIndex) =>
        set((s) => {
          const idx = s.widgets.findIndex((w) => w.id === id);
          if (idx === -1) return s;
          const clamped = Math.max(0, Math.min(s.widgets.length - 1, targetIndex));
          if (idx === clamped) return s;
          const next = [...s.widgets];
          const [widget] = next.splice(idx, 1);
          next.splice(clamped, 0, widget);
          return { widgets: next };
        }),

      resetToDefault: () =>
        set({ widgets: DEFAULT_LAYOUT.map((w) => ({ ...w })), activeLayoutName: "Default" }),

      saveLayout: (name) =>
        set((s) => ({
          namedLayouts: { ...s.namedLayouts, [name]: s.widgets.map((w) => ({ ...w })) },
          activeLayoutName: name,
        })),

      loadLayout: (name) =>
        set((s) => {
          const layout = s.namedLayouts[name];
          if (!layout) return s;
          return { widgets: layout.map((w) => ({ ...w })), activeLayoutName: name };
        }),

      deleteLayout: (name) =>
        set((s) => {
          const next = { ...s.namedLayouts };
          delete next[name];
          return { namedLayouts: next };
        }),
    }),
    {
      name: "mawazin-dashboard-layout",
      version: 1,
    }
  )
);
