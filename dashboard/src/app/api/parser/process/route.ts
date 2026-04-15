import { type NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  if (process.env.MOCK_MODE === "true" || !process.env.SMS_PARSER_URL) {
    return Response.json({
      received: 6,
      parsed: 5,
      created: 4,
      duplicates: 1,
      failed: 0,
      mock: true,
    });
  }

  try {
    const url = `${process.env.SMS_PARSER_URL}/sms/process`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
