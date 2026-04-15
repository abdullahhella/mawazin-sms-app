/**
 * Server-side authenticated client for Firefly III API v1.
 * Reads FIREFLY_URL and FIREFLY_TOKEN from process.env.
 */
import type {
  FireflyAccountsResponse,
  FireflyTransactionsResponse,
  FireflyTransactionPayload,
  FireflyCategoriesResponse,
  FireflySummaryResponse,
  FireflyTagsResponse,
  FireflyBudgetsResponse,
  FireflyBillsResponse,
} from "@/types/firefly";

// ── Error Classes ───────────────────────────────────────────────

export class FireflyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FireflyConfigError";
  }
}

export class FireflyApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "FireflyApiError";
    this.status = status;
    this.body = body;
  }
}

// ── Client ──────────────────────────────────────────────────────

function getConfig() {
  const baseUrl = process.env.FIREFLY_URL;
  const token = process.env.FIREFLY_TOKEN;

  if (!baseUrl) {
    throw new FireflyConfigError("FIREFLY_URL environment variable is not set");
  }
  if (!token) {
    throw new FireflyConfigError("FIREFLY_TOKEN environment variable is not set");
  }

  // Strip trailing slash
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

async function fireflyFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { baseUrl, token } = getConfig();
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    throw new FireflyApiError(
      `Firefly API error: ${res.status} ${res.statusText} on ${path}`,
      res.status,
      body,
    );
  }

  return res.json() as Promise<T>;
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

// ── Public Methods ──────────────────────────────────────────────

export async function getAccounts(
  type: "asset" | "expense" | "revenue",
  limit?: number,
): Promise<FireflyAccountsResponse> {
  const qs = buildQueryString({ type, limit });
  return fireflyFetch<FireflyAccountsResponse>(`/api/v1/accounts${qs}`);
}

export interface TransactionParams {
  start?: string;
  end?: string;
  type?: string;
  limit?: number;
  accountId?: string;
}

export async function getTransactions(
  params: TransactionParams = {},
): Promise<FireflyTransactionsResponse> {
  const { accountId, ...rest } = params;
  const qs = buildQueryString(rest);

  if (accountId) {
    return fireflyFetch<FireflyTransactionsResponse>(
      `/api/v1/accounts/${accountId}/transactions${qs}`,
    );
  }

  return fireflyFetch<FireflyTransactionsResponse>(`/api/v1/transactions${qs}`);
}

export async function createTransaction(
  payload: FireflyTransactionPayload,
): Promise<unknown> {
  return fireflyFetch<unknown>("/api/v1/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCategories(
  limit?: number,
): Promise<FireflyCategoriesResponse> {
  const qs = buildQueryString({ limit });
  return fireflyFetch<FireflyCategoriesResponse>(`/api/v1/categories${qs}`);
}

export async function getSummary(
  start: string,
  end: string,
): Promise<FireflySummaryResponse> {
  const qs = buildQueryString({ start, end });
  return fireflyFetch<FireflySummaryResponse>(`/api/v1/summary/basic${qs}`);
}

export async function getTags(
  limit?: number,
): Promise<FireflyTagsResponse> {
  const qs = buildQueryString({ limit });
  return fireflyFetch<FireflyTagsResponse>(`/api/v1/tags${qs}`);
}

export async function getBudgets(): Promise<FireflyBudgetsResponse> {
  return fireflyFetch<FireflyBudgetsResponse>("/api/v1/budgets");
}

export async function getBills(): Promise<FireflyBillsResponse> {
  return fireflyFetch<FireflyBillsResponse>("/api/v1/bills");
}
