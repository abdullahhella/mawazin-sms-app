import { type NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  return Response.json(
    {
      error: "Voice intake not implemented",
      status: 501,
      docs: "POST { audioUrl, transcript?, locale? } -> parses voice input into transaction",
    },
    { status: 501 },
  );
}
