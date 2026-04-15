import { useQuery } from "@tanstack/react-query";
import type { ParserCard } from "@/lib/mock-fixtures";

async function fetchParserCards(unmappedOnly = false): Promise<ParserCard[]> {
  const qs = unmappedOnly ? "?unmapped_only=true" : "";
  const res = await fetch(`/api/parser/cards${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch parser cards: ${res.statusText}`);
  return res.json();
}

export function useParserCards(unmappedOnly = false) {
  return useQuery<ParserCard[]>({
    queryKey: ["parser-cards", { unmappedOnly }],
    queryFn: () => fetchParserCards(unmappedOnly),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
