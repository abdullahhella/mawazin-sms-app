import { useQuery } from "@tanstack/react-query";
import type { FireflyAccountsResponse } from "@/types/firefly";

async function fetchAccounts(type: string): Promise<FireflyAccountsResponse> {
  const res = await fetch(`/api/firefly/accounts?type=${type}`);
  if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.statusText}`);
  return res.json();
}

export function useAccounts(type = "asset") {
  return useQuery<FireflyAccountsResponse>({
    queryKey: ["accounts", { type }],
    queryFn: () => fetchAccounts(type),
  });
}
