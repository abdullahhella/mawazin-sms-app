import { useQuery } from "@tanstack/react-query";
import type { NetWorthPoint } from "@/types/app";

async function fetchNetWorth(months: number): Promise<NetWorthPoint[]> {
  const res = await fetch(`/api/custom/net-worth-history?months=${months}`);
  if (!res.ok)
    throw new Error(`Failed to fetch net worth history: ${res.statusText}`);
  return res.json();
}

export function useNetWorth(months = 6) {
  return useQuery<NetWorthPoint[]>({
    queryKey: ["net-worth-history", { months }],
    queryFn: () => fetchNetWorth(months),
  });
}
