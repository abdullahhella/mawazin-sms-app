import { useQuery } from "@tanstack/react-query";
import type { ParserPendingSms } from "@/lib/mock-fixtures";

async function fetchParserPending(): Promise<ParserPendingSms[]> {
  const res = await fetch("/api/parser/pending");
  if (!res.ok) throw new Error(`Failed to fetch parser pending: ${res.statusText}`);
  return res.json();
}

export function useParserPending() {
  return useQuery<ParserPendingSms[]>({
    queryKey: ["parser-pending"],
    queryFn: fetchParserPending,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
