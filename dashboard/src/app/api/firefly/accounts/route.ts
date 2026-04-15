import { type NextRequest } from "next/server";
import { getAccounts } from "@/lib/firefly-client";
import { jsonResponse, errorResponse, parseSearchParams } from "@/lib/api-helpers";
import { IS_MOCK_MODE, getMockAccounts } from "@/lib/mock-fixtures";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request);
    const type = (params.type as "asset" | "expense" | "revenue") || "asset";
    const limit = params.limit ? Number(params.limit) : undefined;

    if (IS_MOCK_MODE) {
      return jsonResponse(getMockAccounts(type));
    }

    const data = await getAccounts(type, limit);
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
