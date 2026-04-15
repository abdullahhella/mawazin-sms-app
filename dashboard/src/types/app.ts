/**
 * App-specific types for Mawazin finance dashboard.
 */

// ── Dashboard Data ───────────────────────────────────────────────
export interface NetWorthPoint {
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface CashFlowData {
  income: number;
  expenses: number;
  net: number;
  byCategory: Record<string, number>;
}

export interface AlertItem {
  id: string;
  type: "large-transaction" | "low-balance" | "bill-due" | "budget-overrun" | "unusual-spending";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  relatedId?: string;
}

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  currencyCode: string;
}

// ── Account Grouping ─────────────────────────────────────────────
export interface AccountGroup {
  label: string;
  type: string;
  icon: string;
  accounts: AccountSummary[];
  totalBalance: number;
}

export interface AccountSummary {
  id: string;
  name: string;
  balance: number;
  currencyCode: string;
  role: string | null;
  type: string;
  active: boolean;
}

// ── Transaction (Flattened) ──────────────────────────────────────
export interface FlatTransaction {
  id: string;
  groupId: string;
  groupTitle: string | null;
  type: "withdrawal" | "deposit" | "transfer";
  date: string;
  amount: number;
  description: string;
  categoryName: string | null;
  sourceName: string;
  destinationName: string;
  tags: string[];
  currencyCode: string;
  splitCount: number;
  splitIndex: number;
  source: IntakeSource;
  isSplit: boolean;
}

// ── Intake System (SMS + Voice) ──────────────────────────────────
export type TransactionStatus = "raw" | "enriched" | "pending-review" | "complete";

export type IntakeSource = "sms" | "bot" | "ios" | "dashboard" | "voice" | "manual" | "unknown";

export interface PendingAction {
  id: string;
  rawText: string;
  parsedIntent?: {
    type: "withdrawal" | "deposit" | "transfer";
    amount?: number;
    category?: string;
    merchant?: string;
    description?: string;
  };
  confidence: number;
  status: "pending" | "auto-executed" | "confirmed" | "rejected";
  matchedTransactionId?: string;
  source: IntakeSource;
  createdAt: string;
}

// ── Investments (Future) ─────────────────────────────────────────
export interface Holding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  costBasis: number;
  currentValue: number;
  currency: string;
  exchange?: string;
  lastUpdated: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdings: Holding[];
}

// ── Metrics ──────────────────────────────────────────────────────
export interface DashboardMetrics {
  netBalance: number;
  monthlySpending: number;
  monthlyIncome: number;
  netLending: number;
}
