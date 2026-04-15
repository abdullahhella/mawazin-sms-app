import { type NextRequest } from "next/server";
import { getTags } from "@/lib/firefly-client";
import { jsonResponse, errorResponse, parseSearchParams } from "@/lib/api-helpers";
import { IS_MOCK_MODE, getMockTags } from "@/lib/mock-fixtures";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request);
    const limit = params.limit ? Number(params.limit) : undefined;

    if (IS_MOCK_MODE) {
      return jsonResponse(getMockTags());
    }

    const data = await getTags(limit);
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
