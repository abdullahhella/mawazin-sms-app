import { useQuery } from "@tanstack/react-query";
import type { UpcomingBill } from "@/types/app";

async function fetchUpcomingBills(days: number): Promise<UpcomingBill[]> {
  const res = await fetch(`/api/custom/upcoming-bills?days=${days}`);
  if (!res.ok)
    throw new Error(`Failed to fetch upcoming bills: ${res.statusText}`);
  return res.json();
}

export function useUpcomingBills(days = 14) {
  return useQuery<UpcomingBill[]>({
    queryKey: ["upcoming-bills", { days }],
    queryFn: () => fetchUpcomingBills(days),
  });
}
