import { useQuery } from "@tanstack/react-query";
import type { ParserAccount } from "@/lib/mock-fixtures";

async function fetchParserAccounts(): Promise<ParserAccount[]> {
  const res = await fetch("/api/parser/cards/accounts");
  if (!res.ok) throw new Error(`Failed to fetch parser accounts: ${res.statusText}`);
  return res.json();
}

export function useParserAccounts() {
  return useQuery<ParserAccount[]>({
    queryKey: ["parser-accounts"],
    queryFn: fetchParserAccounts,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
