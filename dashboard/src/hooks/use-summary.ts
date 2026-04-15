import { useQuery } from "@tanstack/react-query";
import type { FireflySummaryResponse } from "@/types/firefly";

async function fetchSummary(
  start: string,
  end: string
): Promise<FireflySummaryResponse> {
  const params = new URLSearchParams({ start, end });
  const res = await fetch(`/api/firefly/summary?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch summary: ${res.statusText}`);
  return res.json();
}

export function useSummary(start: string, end: string) {
  return useQuery<FireflySummaryResponse>({
    queryKey: ["summary", { start, end }],
    queryFn: () => fetchSummary(start, end),
  });
}
