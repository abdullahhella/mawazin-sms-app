/**
 * Transaction origin helpers.
 *
 * Convention: Firefly tags carry a "source:<value>" tag to indicate how
 * the transaction entered the system. See TAG_PREFIX in constants.ts.
 */

import { TAG_PREFIX } from "@/lib/constants";

export type TransactionOrigin = "bot" | "sms" | "ios" | "dashboard" | "unknown";

const VALID_ORIGINS = new Set<TransactionOrigin>(["bot", "sms", "ios", "dashboard"]);

/**
 * Parse a tags array and return the first recognised origin value.
 * Returns "unknown" when tags is undefined/empty or no source tag is found.
 */
export function getOrigin(tags: string[] | undefined): TransactionOrigin {
  if (!tags || tags.length === 0) return "unknown";
  for (const tag of tags) {
    if (tag.startsWith(TAG_PREFIX.source)) {
      const value = tag.slice(TAG_PREFIX.source.length) as TransactionOrigin;
      if (VALID_ORIGINS.has(value)) return value;
    }
  }
  return "unknown";
}

export interface OriginMeta {
  label: string;
  /** Icon component name from lucide-react */
  iconName: string;
  /** Tailwind classes applied to the Badge wrapper */
  colorClass: string;
}

export const ORIGIN_META: Record<TransactionOrigin, OriginMeta> = {
  bot: {
    label: "Telegram Bot",
    iconName: "Bot",
    colorClass:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  sms: {
    label: "SMS",
    iconName: "MessageSquare",
    colorClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  ios: {
    label: "iOS Shortcut",
    iconName: "Smartphone",
    colorClass:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  dashboard: {
    label: "Dashboard (manual)",
    iconName: "LayoutDashboard",
    colorClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  unknown: {
    label: "Unknown source",
    iconName: "HelpCircle",
    colorClass:
      "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
  },
};
