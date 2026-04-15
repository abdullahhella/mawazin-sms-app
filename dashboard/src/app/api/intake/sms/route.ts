import { type NextRequest } from "next/server";

/**
 * Bulk SMS intake — forwards to the mawazin-sms parser service.
 * Accepts:
 *   { messages: [{ bank, message, received_at }], source?: "ios" | "sms" }
 *
 * In development / mock mode we short-circuit and return a synthetic response
 * so the dashboard preview works without a reachable backend.
 */
export async function POST(request: NextRequest) {
  let body: {
    messages?: unknown;
    source?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Validate messages array
  if (
    !Array.isArray(body.messages) ||
    (body.messages as unknown[]).length === 0
  ) {
    return Response.json(
      { error: "Body must contain a non-empty 'messages' array" },
      { status: 400 },
    );
  }

  const rawMessages = body.messages as unknown[];

  for (let i = 0; i < rawMessages.length; i++) {
    const msg = rawMessages[i];
    if (typeof msg !== "object" || msg === null) {
      return Response.json(
        { error: `Invalid message at index ${i}`, detail: "Message must be an object" },
        { status: 400 },
      );
    }
    const m = msg as Record<string, unknown>;
    if (typeof m.bank !== "string" || m.bank.trim() === "") {
      return Response.json(
        { error: `Invalid message at index ${i}`, detail: "'bank' must be a non-empty string" },
        { status: 400 },
      );
    }
    if (typeof m.message !== "string" || m.message.trim() === "") {
      return Response.json(
        { error: `Invalid message at index ${i}`, detail: "'message' must be a non-empty string" },
        { status: 400 },
      );
    }
    if (typeof m.received_at !== "string" || m.received_at.trim() === "") {
      return Response.json(
        { error: `Invalid message at index ${i}`, detail: "'received_at' must be a non-empty string" },
        { status: 400 },
      );
    }
  }

  // Validate optional source
  if (body.source !== undefined && body.source !== "ios" && body.source !== "sms") {
    return Response.json(
      { error: "'source' must be \"ios\" or \"sms\" if provided" },
      { status: 400 },
    );
  }

  const messages = rawMessages as Array<{ bank: string; message: string; received_at: string }>;
  const source = body.source as "ios" | "sms" | undefined;

  if (process.env.MOCK_MODE === "true" || !process.env.SMS_PARSER_URL) {
    return Response.json({
      received: messages.length,
      queued: messages.length,
      duplicates: 0,
      mock: true,
    });
  }

  try {
    const url = `${process.env.SMS_PARSER_URL}/sms/ingest`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SMS_PARSER_API_KEY
          ? { "X-API-Key": process.env.SMS_PARSER_API_KEY }
          : {}),
      },
      body: JSON.stringify({
        messages,
        source: source ?? "ios",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `SMS parser returned ${res.status}`, detail: text },
        { status: 502 },
      );
    }

    const data = await res.json();
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
