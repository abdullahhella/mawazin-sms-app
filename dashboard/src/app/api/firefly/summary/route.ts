import { type NextRequest } from "next/server";
import { getSummary } from "@/lib/firefly-client";
import { jsonResponse, errorResponse, parseSearchParams } from "@/lib/api-helpers";
import { IS_MOCK_MODE, getMockSummary } from "@/lib/mock-fixtures";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request);
    const { start, end } = params;

    if (IS_MOCK_MODE) {
      return jsonResponse(getMockSummary());
    }

    if (!start || !end) {
      return errorResponse("Both 'start' and 'end' query params are required", 400);
    }

    const data = await getSummary(start, end);
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
