/**
 * Application constants for Mawazin finance app.
 */

export const CURRENCY_CODE = "SAR";
export const CURRENCY_SYMBOL = "SAR";
export const LOCALE = "en-SA";

// ── Account Role Groupings ───────────────────────────────────────
export const ACCOUNT_GROUPS: Record<string, { label: string; icon: string; order: number }> = {
  defaultAsset: { label: "Checking", icon: "🏦", order: 1 },
  savingAsset: { label: "Savings", icon: "💰", order: 2 },
  cashWalletAsset: { label: "Cash", icon: "💵", order: 3 },
  // Future: investment, credit card, loan types
  investment: { label: "Investments", icon: "📈", order: 4 },
  creditCard: { label: "Credit Cards", icon: "💳", order: 5 },
  loan: { label: "Loans", icon: "🏠", order: 6 },
};

export const DEFAULT_ACCOUNT_GROUP = { label: "Other", icon: "🏦", order: 99 };

// ── Alert Thresholds ─────────────────────────────────────────────
export const ALERT_THRESHOLDS = {
  largeTransaction: 500, // SAR — flag transactions above this
  lowBalance: 500,       // SAR — warn when account drops below this
  billDueSoon: 3,        // days — highlight bills due within this
};

// ── Intake / AI Confidence ───────────────────────────────────────
export const CONFIDENCE_THRESHOLD = 0.8; // auto-execute above this

// ── Chart Colors ─────────────────────────────────────────────────
export const CHART_COLORS = {
  primary: "hsl(160, 70%, 37%)",     // Teal green
  positive: "hsl(160, 70%, 37%)",
  negative: "hsl(4, 62%, 58%)",
  income: "hsl(160, 70%, 37%)",
  expenses: "hsl(4, 62%, 58%)",
  assets: "hsl(160, 70%, 37%)",
  liabilities: "hsl(4, 62%, 58%)",
  netWorth: "hsl(220, 70%, 50%)",
};

export const CATEGORY_PALETTE = [
  "hsl(160, 70%, 37%)",
  "hsl(220, 70%, 50%)",
  "hsl(35, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(4, 62%, 58%)",
  "hsl(190, 70%, 45%)",
  "hsl(50, 80%, 50%)",
  "hsl(330, 60%, 50%)",
];

// ── Navigation ───────────────────────────────────────────────────
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard", enabled: true },
  { label: "Accounts", href: "/accounts", icon: "Wallet", enabled: true },
  { label: "Parser", href: "/parser", icon: "Inbox", enabled: true },
  { label: "Import", href: "/import", icon: "Upload", enabled: true },
  { label: "Bot", href: "/bot", icon: "Bot", enabled: true },
  { label: "Investments", href: "/investments", icon: "TrendingUp", enabled: false },
  { label: "Budgets", href: "/budgets", icon: "PieChart", enabled: false },
  { label: "Reports", href: "/reports", icon: "BarChart3", enabled: false },
  { label: "Settings", href: "/settings", icon: "Settings", enabled: true },
] as const;

// ── Tag Conventions ──────────────────────────────────────────────
export const TAG_PREFIX = {
  source: "source:",
  status: "status:",
  person: "person:",
} as const;
