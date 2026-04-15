/**
 * Mock fixtures for LOCAL PREVIEW mode.
 * Activated when process.env.MOCK_MODE === "true".
 * Shapes must match the real Firefly/custom API responses so the hooks/components
 * work without modification.
 */
import type {
  FireflyAccountsResponse,
  FireflyAccount,
  FireflyTransactionsResponse,
  FireflyTransactionGroup,
  FireflyBillsResponse,
  FireflyCategoriesResponse,
  FireflyTagsResponse,
  FireflySummaryResponse,
} from "@/types/firefly";
import type {
  AlertItem,
  CashFlowData,
  NetWorthPoint,
  UpcomingBill,
} from "@/types/app";

const now = new Date();
const today = now.toISOString().slice(0, 10);

function daysAgo(n: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysAhead(n: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Asset accounts ────────────────────────────────────────────────
const ASSET_ACCOUNTS: FireflyAccount[] = [
  {
    type: "accounts",
    id: "1",
    attributes: {
      name: "SNB Checking",
      type: "asset",
      current_balance: "18420.75",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "defaultAsset",
      account_number: "SA03 8000 0000 6080 1016 7519",
      iban: "SA0380000000608010167519",
      active: true,
      notes: null,
      include_net_worth: true,
      order: 1,
    },
  },
  {
    type: "accounts",
    id: "2",
    attributes: {
      name: "Al Rajhi Checking",
      type: "asset",
      current_balance: "6210.40",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "defaultAsset",
      account_number: "SA44 8000 0104 6080 1016 8020",
      iban: null,
      active: true,
      notes: null,
      include_net_worth: true,
      order: 2,
    },
  },
  {
    type: "accounts",
    id: "3",
    attributes: {
      name: "Riyad Bank Salary",
      type: "asset",
      current_balance: "432.10",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "defaultAsset",
      account_number: null,
      iban: null,
      active: true,
      notes: null,
      include_net_worth: true,
      order: 3,
    },
  },
  {
    type: "accounts",
    id: "4",
    attributes: {
      name: "SNB Savings",
      type: "asset",
      current_balance: "84500.00",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "savingAsset",
      account_number: null,
      iban: null,
      active: true,
      notes: null,
      include_net_worth: true,
      order: 4,
    },
  },
  {
    type: "accounts",
    id: "5",
    attributes: {
      name: "Emergency Fund",
      type: "asset",
      current_balance: "30000.00",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "savingAsset",
      account_number: null,
      iban: null,
      active: true,
      notes: null,
      include_net_worth: true,
      order: 5,
    },
  },
  {
    type: "accounts",
    id: "6",
    attributes: {
      name: "Cash Wallet",
      type: "asset",
      current_balance: "340.00",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "cashWalletAsset",
      account_number: null,
      iban: null,
      active: true,
      notes: null,
      include_net_worth: true,
      order: 6,
    },
  },
  {
    type: "accounts",
    id: "7",
    attributes: {
      name: "BSF Checking",
      type: "asset",
      current_balance: "2105.55",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "defaultAsset",
      account_number: null,
      iban: null,
      active: true,
      notes: null,
      include_net_worth: true,
      order: 7,
    },
  },
  // Liability accounts (modelled as asset with negative balance,
  // Firefly often uses separate types — we keep them in the same list so the
  // existing accounts page renders them in the "Other" / "Credit Cards" group.
  {
    type: "accounts",
    id: "8",
    attributes: {
      name: "SNB Credit Card",
      type: "liability",
      current_balance: "-4820.30",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "creditCard",
      account_number: null,
      iban: null,
      active: true,
      notes: null,
      include_net_worth: true,
      order: 8,
    },
  },
  {
    type: "accounts",
    id: "9",
    attributes: {
      name: "Al Rajhi Visa",
      type: "liability",
      current_balance: "-1240.00",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "creditCard",
      account_number: null,
      iban: null,
      active: true,
      notes: null,
      include_net_worth: true,
      order: 9,
    },
  },
  {
    type: "accounts",
    id: "10",
    attributes: {
      name: "Home Mortgage",
      type: "liability",
      current_balance: "-385000.00",
      current_balance_date: today,
      currency_code: "SAR",
      currency_symbol: "SAR",
      account_role: "loan",
      account_number: null,
      iban: null,
      active: true,
      notes: null,
      include_net_worth: true,
      order: 10,
    },
  },
];

const EXPENSE_ACCOUNTS: FireflyAccount[] = [
  "Jarir", "Panda Supermarket", "Talabat", "STC", "Saudi Electricity",
  "Careem", "Amazon.sa", "Tamimi Markets",
].map((name, i) => ({
  type: "accounts",
  id: `e${i + 1}`,
  attributes: {
    name,
    type: "expense",
    current_balance: "0.00",
    current_balance_date: today,
    currency_code: "SAR",
    currency_symbol: "SAR",
    account_role: null,
    account_number: null,
    iban: null,
    active: true,
    notes: null,
    include_net_worth: false,
    order: i + 1,
  },
}));

const REVENUE_ACCOUNTS: FireflyAccount[] = [
  "Employer Salary", "Freelance", "Interest", "Refund",
].map((name, i) => ({
  type: "accounts",
  id: `r${i + 1}`,
  attributes: {
    name,
    type: "revenue",
    current_balance: "0.00",
    current_balance_date: today,
    currency_code: "SAR",
    currency_symbol: "SAR",
    account_role: null,
    account_number: null,
    iban: null,
    active: true,
    notes: null,
    include_net_worth: false,
    order: i + 1,
  },
}));

export function getMockAccounts(type: string): FireflyAccountsResponse {
  let data: FireflyAccount[];
  if (type === "expense") data = EXPENSE_ACCOUNTS;
  else if (type === "revenue") data = REVENUE_ACCOUNTS;
  else data = ASSET_ACCOUNTS;
  return {
    data,
    meta: {
      pagination: {
        total: data.length,
        count: data.length,
        per_page: 100,
        current_page: 1,
        total_pages: 1,
      },
    },
  };
}

// ── Transactions ──────────────────────────────────────────────────
interface MockTxInput {
  id: string;
  type: "withdrawal" | "deposit" | "transfer";
  date: string;
  amount: string;
  description: string;
  category: string | null;
  source: { id: string; name: string; type: string };
  destination: { id: string; name: string; type: string };
  tags?: string[];
}

function buildTxGroup(i: MockTxInput): FireflyTransactionGroup {
  return {
    type: "transactions",
    id: i.id,
    attributes: {
      group_title: null,
      transactions: [
        {
          type: i.type,
          date: i.date,
          amount: i.amount,
          description: i.description,
          category_id: null,
          category_name: i.category,
          source_id: i.source.id,
          source_name: i.source.name,
          source_type: i.source.type,
          destination_id: i.destination.id,
          destination_name: i.destination.name,
          destination_type: i.destination.type,
          tags: i.tags ?? [],
          currency_code: "SAR",
          currency_symbol: "SAR",
          foreign_amount: null,
          foreign_currency_code: null,
          notes: null,
          order: 0,
          reconciled: false,
        },
      ],
    },
  };
}

// Generate a spread of transactions across recent days, tied to various accounts.
const TX_SEED: Array<Omit<MockTxInput, "date"> & { daysAgo: number; accountId: string }> = [
  // sms ×10 (~50%)
  { id: "t1",  daysAgo: 0,  accountId: "1", type: "withdrawal", amount: "28.00",   description: "Morning coffee — Dr.Cafe",        category: "Dining",     source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "e4", name: "Dr.Cafe", type: "expense" },           tags: ["source:sms"] },
  { id: "t2",  daysAgo: 0,  accountId: "1", type: "withdrawal", amount: "185.40",  description: "Panda groceries",                  category: "Groceries",  source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "e2", name: "Panda Supermarket", type: "expense" }, tags: ["source:sms"] },
  { id: "t3",  daysAgo: 1,  accountId: "2", type: "withdrawal", amount: "55.00",   description: "Careem ride home",                 category: "Transport",  source: { id: "2", name: "Al Rajhi Checking", type: "asset" },     destination: { id: "e6", name: "Careem", type: "expense" },           tags: ["source:sms"] },
  { id: "t5",  daysAgo: 2,  accountId: "1", type: "withdrawal", amount: "620.00",  description: "STC monthly plan",                 category: "Bills",      source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "e4", name: "STC", type: "expense" },              tags: ["source:sms"] },
  { id: "t6",  daysAgo: 2,  accountId: "2", type: "withdrawal", amount: "89.50",   description: "Talabat dinner",                   category: "Dining",     source: { id: "2", name: "Al Rajhi Checking", type: "asset" },     destination: { id: "e3", name: "Talabat", type: "expense" },          tags: ["source:sms"] },
  { id: "t8",  daysAgo: 3,  accountId: "1", type: "withdrawal", amount: "412.15",  description: "Saudi Electricity bill",           category: "Bills",      source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "e5", name: "Saudi Electricity", type: "expense" }, tags: ["source:sms"] },
  { id: "t10", daysAgo: 5,  accountId: "2", type: "withdrawal", amount: "230.75",  description: "Tamimi groceries",                 category: "Groceries",  source: { id: "2", name: "Al Rajhi Checking", type: "asset" },     destination: { id: "e8", name: "Tamimi Markets", type: "expense" },   tags: ["source:sms"] },
  { id: "t13", daysAgo: 8,  accountId: "2", type: "withdrawal", amount: "34.00",   description: "Coffee — Starbucks",               category: "Dining",     source: { id: "2", name: "Al Rajhi Checking", type: "asset" },     destination: { id: "e4", name: "Starbucks", type: "expense" },        tags: ["source:sms"] },
  { id: "t15", daysAgo: 10, accountId: "1", type: "withdrawal", amount: "95.00",   description: "Talabat breakfast",                category: "Dining",     source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "e3", name: "Talabat", type: "expense" },          tags: ["source:sms"] },
  { id: "t16", daysAgo: 12, accountId: "2", type: "withdrawal", amount: "318.20",  description: "Panda groceries",                  category: "Groceries",  source: { id: "2", name: "Al Rajhi Checking", type: "asset" },     destination: { id: "e2", name: "Panda Supermarket", type: "expense" }, tags: ["source:sms"] },
  // bot ×4 (~20%)
  { id: "t4",  daysAgo: 1,  accountId: "1", type: "deposit",    amount: "14500.00",description: "Salary — October",                 category: "Income",     source: { id: "r1", name: "Employer Salary", type: "revenue" },    destination: { id: "1", name: "SNB Checking", type: "asset" },        tags: ["source:bot"] },
  { id: "t9",  daysAgo: 4,  accountId: "1", type: "withdrawal", amount: "67.00",   description: "Amazon.sa — USB cables",           category: "Shopping",   source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "e7", name: "Amazon.sa", type: "expense" },        tags: ["source:bot"] },
  { id: "t14", daysAgo: 9,  accountId: "1", type: "withdrawal", amount: "156.00",  description: "Pharmacy — Nahdi",                 category: "Health",     source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "e9", name: "Nahdi", type: "expense" },            tags: ["source:bot"] },
  { id: "t19", daysAgo: 18, accountId: "1", type: "withdrawal", amount: "78.25",   description: "Bakery — Bateel",                  category: "Dining",     source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "e3", name: "Bateel", type: "expense" },           tags: ["source:bot"] },
  // ios ×3 (~15%)
  { id: "t7",  daysAgo: 3,  accountId: "8", type: "withdrawal", amount: "1240.00", description: "Jarir — Laptop accessories",       category: "Shopping",   source: { id: "8", name: "SNB Credit Card", type: "liability" },   destination: { id: "e1", name: "Jarir", type: "expense" },            tags: ["source:ios"] },
  { id: "t17", daysAgo: 14, accountId: "9", type: "withdrawal", amount: "480.00",  description: "Dinner at Najd Village",           category: "Dining",     source: { id: "9", name: "Al Rajhi Visa", type: "liability" },     destination: { id: "e3", name: "Najd Village", type: "expense" },     tags: ["source:ios"] },
  { id: "t18", daysAgo: 15, accountId: "1", type: "deposit",    amount: "1200.00", description: "Freelance — Design gig",           category: "Income",     source: { id: "r2", name: "Freelance", type: "revenue" },          destination: { id: "1", name: "SNB Checking", type: "asset" },        tags: ["source:ios"] },
  // dashboard ×2 (~10%)
  { id: "t11", daysAgo: 6,  accountId: "1", type: "transfer",   amount: "2000.00", description: "Transfer to savings",              category: null,         source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "4", name: "SNB Savings", type: "asset" },         tags: ["source:dashboard"] },
  { id: "t12", daysAgo: 7,  accountId: "1", type: "withdrawal", amount: "720.00",  description: "Credit card payment",              category: "Transfers",  source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "8", name: "SNB Credit Card", type: "liability" }, tags: ["source:dashboard"] },
  // no source tag → unknown (~5%)
  { id: "t20", daysAgo: 20, accountId: "1", type: "withdrawal", amount: "1850.00", description: "Mortgage payment",                 category: "Housing",    source: { id: "1", name: "SNB Checking", type: "asset" },          destination: { id: "10", name: "Home Mortgage", type: "liability" } },
];

function allTransactions(): FireflyTransactionGroup[] {
  return TX_SEED.map((t) => buildTxGroup({ ...t, date: daysAgo(t.daysAgo) }));
}

export function getMockTransactions(params: {
  start?: string;
  end?: string;
  type?: string;
  limit?: number;
  accountId?: string;
}): FireflyTransactionsResponse {
  let data = allTransactions();

  if (params.accountId) {
    data = TX_SEED
      .filter((t) => t.accountId === params.accountId ||
        // include transfers where the account is source or dest
        (t.source.id === params.accountId || t.destination.id === params.accountId))
      .map((t) => buildTxGroup({ ...t, date: daysAgo(t.daysAgo) }));
  }

  if (params.start) {
    data = data.filter((g) => g.attributes.transactions[0].date >= params.start!);
  }
  if (params.end) {
    data = data.filter((g) => g.attributes.transactions[0].date <= params.end!);
  }
  if (params.type) {
    data = data.filter((g) => g.attributes.transactions[0].type === params.type);
  }
  if (params.limit) {
    data = data.slice(0, params.limit);
  }

  return {
    data,
    meta: {
      pagination: {
        total: data.length,
        count: data.length,
        per_page: params.limit ?? 50,
        current_page: 1,
        total_pages: 1,
      },
    },
  };
}

// ── Bills ──────────────────────────────────────────────────────────
export function getMockBills(): FireflyBillsResponse {
  const bills = [
    { id: "b1", name: "STC Mobile",         amount: "620.00",  due: daysAhead(2) },
    { id: "b2", name: "Saudi Electricity",  amount: "410.00",  due: daysAhead(5) },
    { id: "b3", name: "Home Internet",      amount: "299.00",  due: daysAhead(9) },
    { id: "b4", name: "Mortgage",           amount: "1850.00", due: daysAhead(12) },
  ];
  return {
    data: bills.map((b) => ({
      type: "bills",
      id: b.id,
      attributes: {
        name: b.name,
        amount_min: b.amount,
        amount_max: b.amount,
        date: today,
        repeat_freq: "monthly",
        currency_code: "SAR",
        active: true,
        next_expected_match: b.due,
        notes: null,
        order: parseInt(b.id.slice(1)),
      },
    })),
    meta: {
      pagination: {
        total: bills.length,
        count: bills.length,
        per_page: 50,
        current_page: 1,
        total_pages: 1,
      },
    },
  };
}

// ── Categories & Tags ─────────────────────────────────────────────
export function getMockCategories(): FireflyCategoriesResponse {
  const cats = ["Dining", "Groceries", "Transport", "Bills", "Shopping", "Health", "Housing", "Income", "Transfers"];
  return {
    data: cats.map((name, i) => ({
      type: "categories",
      id: String(i + 1),
      attributes: { name, notes: null },
    })),
    meta: {
      pagination: {
        total: cats.length,
        count: cats.length,
        per_page: 50,
        current_page: 1,
        total_pages: 1,
      },
    },
  };
}

export function getMockTags(): FireflyTagsResponse {
  const tags = ["source:sms", "source:bot", "source:ios", "source:dashboard", "status:reviewed"];
  return {
    data: tags.map((tag, i) => ({
      type: "tags",
      id: String(i + 1),
      attributes: { tag, date: null, description: null },
    })),
    meta: {
      pagination: {
        total: tags.length,
        count: tags.length,
        per_page: 50,
        current_page: 1,
        total_pages: 1,
      },
    },
  };
}

// ── Summary ────────────────────────────────────────────────────────
export function getMockSummary(): FireflySummaryResponse {
  return {
    "balance-in-sarSAR": {
      key: "balance-in-sarSAR",
      value: "15780.25",
      currency_code: "SAR",
      currency_symbol: "SAR",
      value_parsed: "SAR 15,780.25",
    },
    "spent-in-sarSAR": {
      key: "spent-in-sarSAR",
      value: "-6420.30",
      currency_code: "SAR",
      currency_symbol: "SAR",
      value_parsed: "SAR -6,420.30",
    },
    "earned-in-sarSAR": {
      key: "earned-in-sarSAR",
      value: "15700.00",
      currency_code: "SAR",
      currency_symbol: "SAR",
      value_parsed: "SAR 15,700.00",
    },
  };
}

// ── Custom endpoints ───────────────────────────────────────────────
export function getMockAlerts(): AlertItem[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: "a1",
      type: "large-transaction",
      title: "Large Transaction",
      message: "Spent SAR 1,240.00 — Jarir — Laptop accessories",
      severity: "info",
      createdAt: nowIso,
      relatedId: "t7",
    },
    {
      id: "a2",
      type: "low-balance",
      title: "Low Balance",
      message: "Riyad Bank Salary balance is SAR 432.10",
      severity: "warning",
      createdAt: nowIso,
      relatedId: "3",
    },
    {
      id: "a3",
      type: "bill-due",
      title: "Bill Due Soon",
      message: "STC Mobile (~SAR 620.00) is due in 2 days",
      severity: "warning",
      createdAt: nowIso,
      relatedId: "b1",
    },
  ];
}

export function getMockCashFlow(): CashFlowData {
  return {
    income: 15700,
    expenses: 6420.3,
    net: 9279.7,
    byCategory: {
      Dining: 814.5,
      Groceries: 733.95,
      Transport: 215,
      Bills: 1342.15,
      Shopping: 1307.0,
      Health: 156,
      Housing: 1850,
    },
  };
}

export function getMockNetWorth(months: number = 6): NetWorthPoint[] {
  const points: NetWorthPoint[] = [];
  const base = 118_000;
  const growth = 2400;
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const assets = base + (months - 1 - i) * growth + Math.round(Math.random() * 800);
    const liabilities = 390_000 - (months - 1 - i) * 900;
    points.push({
      date: d.toISOString().slice(0, 10),
      assets,
      liabilities,
      netWorth: assets - liabilities,
    });
  }
  return points;
}

export function getMockUpcomingBills(days: number = 14): UpcomingBill[] {
  const bills = [
    { id: "b1", name: "STC Mobile",        amount: 620,  due: 2 },
    { id: "b2", name: "Saudi Electricity", amount: 410,  due: 5 },
    { id: "b3", name: "Home Internet",     amount: 299,  due: 9 },
    { id: "b4", name: "Mortgage",          amount: 1850, due: 12 },
  ];
  return bills
    .filter((b) => b.due <= days)
    .map((b) => ({
      id: b.id,
      name: b.name,
      amount: b.amount,
      dueDate: daysAhead(b.due),
      daysUntilDue: b.due,
      currencyCode: "SAR",
    }));
}

export const IS_MOCK_MODE = process.env.MOCK_MODE === "true";

// ── Parser / mawazin-sms fixtures ─────────────────────────────────

export interface ParserPendingSms {
  id: string;
  bank: string;
  snippet: string;
  received_at: string;
  status: "pending" | "parsed" | "failed" | "duplicate";
  card_fragment: string | null;
  amount: number | null;
  confidence: number | null;
}

export interface ParserRun {
  id: string;
  created_at: string;
  received: number;
  parsed: number;
  created: number;
  duplicates: number;
  failed: number;
}

export interface ParserCard {
  fragment: string;
  bank: string;
  occurrences: number;
  firefly_account_id: string | null;
  firefly_account_name: string | null;
}

export interface ParserAccount {
  id: string;
  name: string;
  type: string;
}

function hoursAgo(h: number): string {
  const d = new Date(now);
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

export function getMockParserPending(): ParserPendingSms[] {
  return [
    {
      id: "sms-1",
      bank: "SNB",
      snippet: "Purchase SAR 185.40 at PANDA SUPERMARKET on card *5492",
      received_at: hoursAgo(1),
      status: "pending",
      card_fragment: "*5492",
      amount: 185.40,
      confidence: 0.94,
    },
    {
      id: "sms-2",
      bank: "Al Rajhi",
      snippet: "CARD: XX2838 — withdrawal 500.00 SAR at ATM",
      received_at: hoursAgo(2),
      status: "pending",
      card_fragment: "XX2838",
      amount: 500.00,
      confidence: 0.88,
    },
    {
      id: "sms-3",
      bank: "STC Pay",
      snippet: "You sent SAR 55 to Careem via STC Pay",
      received_at: hoursAgo(3),
      status: "parsed",
      card_fragment: "**9073",
      amount: 55.00,
      confidence: 0.97,
    },
    {
      id: "sms-4",
      bank: "Riyad",
      snippet: "Purchase Auth 89.50 SAR — TALABAT on card 4721",
      received_at: hoursAgo(4),
      status: "parsed",
      card_fragment: "*4721",
      amount: 89.50,
      confidence: 0.91,
    },
    {
      id: "sms-5",
      bank: "BSF",
      snippet: "Debit SAR 412.15 Saudi Electricity — acc ****2211",
      received_at: hoursAgo(5),
      status: "pending",
      card_fragment: "*2211",
      amount: 412.15,
      confidence: 0.82,
    },
    {
      id: "sms-6",
      bank: "SNB",
      snippet: "ATM withdrawal 200.00 SAR card *5492 balance 18420",
      received_at: hoursAgo(6),
      status: "duplicate",
      card_fragment: "*5492",
      amount: 200.00,
      confidence: 0.99,
    },
  ];
}

export function getMockParserRuns(): ParserRun[] {
  return [
    {
      id: "run-1",
      created_at: hoursAgo(2),
      received: 12,
      parsed: 10,
      created: 9,
      duplicates: 2,
      failed: 0,
    },
    {
      id: "run-2",
      created_at: hoursAgo(4),
      received: 8,
      parsed: 8,
      created: 6,
      duplicates: 2,
      failed: 0,
    },
    {
      id: "run-3",
      created_at: hoursAgo(8),
      received: 3,
      parsed: 2,
      created: 2,
      duplicates: 1,
      failed: 0,
    },
    {
      id: "run-4",
      created_at: hoursAgo(26),
      received: 15,
      parsed: 14,
      created: 12,
      duplicates: 2,
      failed: 1,
    },
    {
      id: "run-5",
      created_at: hoursAgo(30),
      received: 9,
      parsed: 9,
      created: 7,
      duplicates: 2,
      failed: 0,
    },
  ];
}

export function getMockParserCards(): ParserCard[] {
  return [
    { fragment: "*5492",  bank: "SNB",         occurrences: 142, firefly_account_id: "1",   firefly_account_name: "SNB Checking" },
    { fragment: "XX2838", bank: "Al Rajhi",    occurrences: 97,  firefly_account_id: "2",   firefly_account_name: "Al Rajhi Checking" },
    { fragment: "*4721",  bank: "Riyad",       occurrences: 64,  firefly_account_id: "3",   firefly_account_name: "Riyad Bank Salary" },
    { fragment: "**9073", bank: "STC Pay",     occurrences: 38,  firefly_account_id: "6",   firefly_account_name: "Cash Wallet" },
    { fragment: "*2211",  bank: "BSF",         occurrences: 22,  firefly_account_id: "7",   firefly_account_name: "BSF Checking" },
    { fragment: "**4488", bank: "EmiratesNBD", occurrences: 11,  firefly_account_id: null,  firefly_account_name: null },
    { fragment: "*6655",  bank: "SNB",         occurrences: 8,   firefly_account_id: "8",   firefly_account_name: "SNB Credit Card" },
    { fragment: "XX1091", bank: "Al Rajhi",    occurrences: 5,   firefly_account_id: "9",   firefly_account_name: "Al Rajhi Visa" },
    { fragment: "*7120",  bank: "Unknown",     occurrences: 3,   firefly_account_id: null,  firefly_account_name: null },
    { fragment: "**3344", bank: "Unknown",     occurrences: 2,   firefly_account_id: null,  firefly_account_name: null },
  ];
}

export function getMockParserAccounts(): ParserAccount[] {
  return [
    { id: "1", name: "SNB Checking",       type: "asset" },
    { id: "2", name: "Al Rajhi Checking",  type: "asset" },
    { id: "3", name: "Riyad Bank Salary",  type: "asset" },
    { id: "4", name: "SNB Savings",        type: "asset" },
    { id: "6", name: "Cash Wallet",        type: "asset" },
    { id: "7", name: "BSF Checking",       type: "asset" },
    { id: "8", name: "SNB Credit Card",    type: "liability" },
    { id: "9", name: "Al Rajhi Visa",      type: "liability" },
  ];
}
