import { type NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  return Response.json(
    {
      error: "Investment performance endpoint not implemented",
      status: 501,
      docs: "GET ?period=1m|3m|6m|1y|all -> returns portfolio performance over time",
    },
    { status: 501 },
  );
}
