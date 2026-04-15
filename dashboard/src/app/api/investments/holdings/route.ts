import { type NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  return Response.json(
    {
      error: "Investment holdings endpoint not implemented",
      status: 501,
      docs: "GET -> returns portfolio holdings with current values and gain/loss",
    },
    { status: 501 },
  );
}
