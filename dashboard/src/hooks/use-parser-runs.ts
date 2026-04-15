import { useQuery } from "@tanstack/react-query";
import type { ParserRun } from "@/lib/mock-fixtures";

async function fetchParserRuns(): Promise<ParserRun[]> {
  const res = await fetch("/api/parser/runs");
  if (!res.ok) throw new Error(`Failed to fetch parser runs: ${res.statusText}`);
  return res.json();
}

export function useParserRuns() {
  return useQuery<ParserRun[]>({
    queryKey: ["parser-runs"],
    queryFn: fetchParserRuns,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
