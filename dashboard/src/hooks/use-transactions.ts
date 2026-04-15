import { useQuery } from "@tanstack/react-query";
import type { FireflyTransactionsResponse } from "@/types/firefly";

interface TransactionParams {
  start?: string;
  end?: string;
  type?: string;
  limit?: number;
  accountId?: string;
}

async function fetchTransactions(
  params: TransactionParams
): Promise<FireflyTransactionsResponse> {
  const searchParams = new URLSearchParams();
  if (params.start) searchParams.set("start", params.start);
  if (params.end) searchParams.set("end", params.end);
  if (params.type) searchParams.set("type", params.type);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.accountId) searchParams.set("accountId", params.accountId);

  const qs = searchParams.toString();
  const res = await fetch(`/api/firefly/transactions${qs ? `?${qs}` : ""}`);
  if (!res.ok)
    throw new Error(`Failed to fetch transactions: ${res.statusText}`);
  return res.json();
}

export function useTransactions(params: TransactionParams = {}) {
  return useQuery<FireflyTransactionsResponse>({
    queryKey: ["transactions", params],
    queryFn: () => fetchTransactions(params),
  });
}
