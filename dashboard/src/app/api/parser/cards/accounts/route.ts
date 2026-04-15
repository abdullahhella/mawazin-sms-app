import { type NextRequest } from "next/server";
import { getMockParserAccounts } from "@/lib/mock-fixtures";

export async function GET(_request: NextRequest) {
  if (process.env.MOCK_MODE === "true" || !process.env.SMS_PARSER_URL) {
    return Response.json(getMockParserAccounts());
  }

  try {
    const url = `${process.env.SMS_PARSER_URL}/cards/accounts`;
    const res = await fetch(url, {
      headers: {
        ...(process.env.SMS_PARSER_API_KEY
          ? { "X-API-Key": process.env.SMS_PARSER_API_KEY }
          : {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `SMS parser returned ${res.status}`, detail: text },
        { status: 502 },
      );
    }

    const data: unknown = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json(
      {
        error: "Could not reach SMS parser service",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
