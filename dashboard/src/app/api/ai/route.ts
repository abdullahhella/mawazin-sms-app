import { type NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  return Response.json(
    {
      error: "AI endpoint not implemented",
      status: 501,
      docs: "POST { action: 'parse' | 'categorize' | 'chat', payload } -> AI-assisted operations via local LLM",
    },
    { status: 501 },
  );
}
