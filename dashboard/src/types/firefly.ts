/**
 * TypeScript interfaces for Firefly III API v1 response shapes.
 */

// ── Pagination ───────────────────────────────────────────────────
export interface FireflyPagination {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

export interface FireflyMeta {
  pagination: FireflyPagination;
}

// ── Account ──────────────────────────────────────────────────────
export interface FireflyAccountAttributes {
  name: string;
  type: string;
  current_balance: string;
  current_balance_date: string;
  currency_code: string;
  currency_symbol: string;
  account_role: string | null;
  account_number: string | null;
  iban: string | null;
  active: boolean;
  notes: string | null;
  include_net_worth: boolean;
  order: number | null;
}

export interface FireflyAccount {
  type: string;
  id: string;
  attributes: FireflyAccountAttributes;
}

export interface FireflyAccountsResponse {
  data: FireflyAccount[];
  meta: FireflyMeta;
}

// ── Transaction ──────────────────────────────────────────────────
export interface FireflyTransactionSplit {
  type: "withdrawal" | "deposit" | "transfer";
  date: string;
  amount: string;
  description: string;
  category_id: string | null;
  category_name: string | null;
  source_id: string;
  source_name: string;
  source_type: string;
  destination_id: string;
  destination_name: string;
  destination_type: string;
  tags: (string | { tag: string })[] | null;
  currency_code: string;
  currency_symbol: string;
  foreign_amount: string | null;
  foreign_currency_code: string | null;
  notes: string | null;
  order: number;
  reconciled: boolean;
}

export interface FireflyTransactionAttributes {
  group_title: string | null;
  transactions: FireflyTransactionSplit[];
}

export interface FireflyTransactionGroup {
  type: string;
  id: string;
  attributes: FireflyTransactionAttributes;
}

export interface FireflyTransactionsResponse {
  data: FireflyTransactionGroup[];
  meta: FireflyMeta;
}

export interface FireflyTransactionPayload {
  group_title?: string;
  transactions: Array<{
    type: "withdrawal" | "deposit" | "transfer";
    date: string;
    amount: string;
    description: string;
    source_name?: string;
    source_id?: string;
    destination_name?: string;
    destination_id?: string;
    category_name?: string;
    tags?: string[];
    currency_code?: string;
    notes?: string;
  }>;
}

// ── Category ─────────────────────────────────────────────────────
export interface FireflyCategoryAttributes {
  name: string;
  notes: string | null;
}

export interface FireflyCategory {
  type: string;
  id: string;
  attributes: FireflyCategoryAttributes;
}

export interface FireflyCategoriesResponse {
  data: FireflyCategory[];
  meta: FireflyMeta;
}

// ── Bill ─────────────────────────────────────────────────────────
export interface FireflyBillAttributes {
  name: string;
  amount_min: string;
  amount_max: string;
  date: string;
  repeat_freq: string;
  currency_code: string;
  active: boolean;
  next_expected_match: string | null;
  notes: string | null;
  order: number;
}

export interface FireflyBill {
  type: string;
  id: string;
  attributes: FireflyBillAttributes;
}

export interface FireflyBillsResponse {
  data: FireflyBill[];
  meta: FireflyMeta;
}

// ── Tag ──────────────────────────────────────────────────────────
export interface FireflyTagAttributes {
  tag: string;
  date: string | null;
  description: string | null;
}

export interface FireflyTag {
  type: string;
  id: string;
  attributes: FireflyTagAttributes;
}

export interface FireflyTagsResponse {
  data: FireflyTag[];
  meta: FireflyMeta;
}

// ── Summary ──────────────────────────────────────────────────────
export interface FireflySummaryEntry {
  key: string;
  value: string;
  currency_code: string;
  currency_symbol: string;
  value_parsed: string;
}

export type FireflySummaryResponse = Record<string, FireflySummaryEntry>;

// ── Budget ───────────────────────────────────────────────────────
export interface FireflyBudgetAttributes {
  name: string;
  active: boolean;
  order: number;
  notes: string | null;
}

export interface FireflyBudget {
  type: string;
  id: string;
  attributes: FireflyBudgetAttributes;
}

export interface FireflyBudgetsResponse {
  data: FireflyBudget[];
  meta: FireflyMeta;
}
