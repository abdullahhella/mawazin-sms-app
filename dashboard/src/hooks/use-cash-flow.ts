import { useQuery } from "@tanstack/react-query";
import { monthRange } from "@/lib/date-utils";
import type { CashFlowData } from "@/types/app";

async function fetchCashFlow(
  start: string,
  end: string
): Promise<CashFlowData> {
  const params = new URLSearchParams({ start, end });
  const res = await fetch(`/api/custom/cash-flow?${params}`);
  if (!res.ok)
    throw new Error(`Failed to fetch cash flow: ${res.statusText}`);
  return res.json();
}

export function useCashFlow(start?: string, end?: string) {
  const defaults = monthRange();
  const s = start ?? defaults.start;
  const e = end ?? defaults.end;

  return useQuery<CashFlowData>({
    queryKey: ["cash-flow", { start: s, end: e }],
    queryFn: () => fetchCashFlow(s, e),
  });
}
