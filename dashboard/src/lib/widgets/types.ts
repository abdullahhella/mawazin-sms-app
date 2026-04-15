/**
 * Widget system types — shape of a widget instance on the dashboard
 * and the definition catalog entry that describes each widget type.
 */

export type WidgetType =
  | "metric-net-balance"
  | "metric-monthly-spending"
  | "metric-monthly-income"
  | "metric-net-lending"
  | "metric-liabilities"
  | "metric-savings-rate"
  | "chart-net-worth"
  | "chart-cash-flow"
  | "chart-spending-by-category"
  | "chart-income-vs-expenses"
  | "list-accounts"
  | "list-upcoming-bills"
  | "list-recent-transactions"
  | "list-top-categories"
  | "inbox-alerts"
  | "inbox-needs-context"
  | "stat-accounts-count"
  | "stat-transactions-this-month"
  | "note-heading";

export type WidgetCategory = "Metrics" | "Charts" | "Lists" | "Activity" | "Custom";

export type ChartType = "line" | "bar" | "area" | "pie";

export interface WidgetConfig {
  /** Chart widgets can switch chart type in edit mode */
  chartType?: ChartType;
  /** Override the default title shown in the widget header */
  title?: string;
  /** For metric widgets: show percent change vs previous period */
  showTrend?: boolean;
  /** For list widgets: how many rows to show */
  limit?: number;
  /** For note / heading widget: the display text */
  text?: string;
  /** For chart widgets: time range */
  range?: "1m" | "3m" | "6m" | "1y" | "all";
}

export interface WidgetInstance {
  /** Per-instance UUID — stable across reloads */
  id: string;
  type: WidgetType;
  /** Grid column position (0-based, 0..11 on a 12-col grid) */
  x: number;
  /** Grid row position (0-based) */
  y: number;
  /** Width in grid cells (1..12) */
  w: number;
  /** Height in grid rows (1..6 typical) */
  h: number;
  /** Optional per-widget settings */
  config?: WidgetConfig;
}

export interface WidgetDefinition {
  type: WidgetType;
  category: WidgetCategory;
  title: string;
  description: string;
  /** lucide icon name (kept as string so we can render dynamically) */
  icon: string;
  /** Default size when added to the grid */
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  /** Whether the widget supports chart-type switching */
  supportsChartTypes?: ChartType[];
  /** Small static preview rendered in the "Add Widget" dialog */
  previewAccent?: string; // tailwind gradient class e.g. "from-emerald-500 to-teal-500"
}
