import { type NextRequest } from "next/server";

interface CardAssignBody {
  firefly_account_id: string;
  firefly_account_name: string;
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/parser/cards/[fragment]">,
) {
  const { fragment } = await ctx.params;

  let body: CardAssignBody;
  try {
    body = (await request.json()) as CardAssignBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.firefly_account_id !== "string" ||
    typeof body.firefly_account_name !== "string"
  ) {
    return Response.json(
      { error: "Body must contain firefly_account_id and firefly_account_name" },
      { status: 400 },
    );
  }

  if (process.env.MOCK_MODE === "true" || !process.env.SMS_PARSER_URL) {
    return Response.json({
      fragment,
      firefly_account_id: body.firefly_account_id,
      firefly_account_name: body.firefly_account_name,
      mock: true,
    });
  }

  try {
    const encodedFragment = encodeURIComponent(fragment);
    const url = `${process.env.SMS_PARSER_URL}/cards/${encodedFragment}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SMS_PARSER_API_KEY
          ? { "X-API-Key": process.env.SMS_PARSER_API_KEY }
          : {}),
      },
      body: JSON.stringify(body),
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
