import { type NextRequest } from "next/server";
import { getMockParserCards } from "@/lib/mock-fixtures";

export async function GET(request: NextRequest) {
  const unmappedOnly = request.nextUrl.searchParams.get("unmapped_only") ?? "false";

  if (process.env.MOCK_MODE === "true" || !process.env.SMS_PARSER_URL) {
    const cards = getMockParserCards();
    if (unmappedOnly === "true") {
      return Response.json(cards.filter((c) => c.firefly_account_id === null));
    }
    return Response.json(cards);
  }

  try {
    const url = `${process.env.SMS_PARSER_URL}/cards?unmapped_only=${unmappedOnly}`;
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
