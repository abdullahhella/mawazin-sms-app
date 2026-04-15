import { useQuery } from "@tanstack/react-query";
import type { AlertItem } from "@/types/app";

async function fetchAlerts(): Promise<AlertItem[]> {
  const res = await fetch("/api/custom/alerts");
  if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.statusText}`);
  return res.json();
}

export function useAlerts() {
  return useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
  });
}
