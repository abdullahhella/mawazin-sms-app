import { type NextRequest } from "next/server";
import { getBills } from "@/lib/firefly-client";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { IS_MOCK_MODE, getMockBills } from "@/lib/mock-fixtures";

export async function GET(_request: NextRequest) {
  try {
    if (IS_MOCK_MODE) {
      return jsonResponse(getMockBills());
    }
    const data = await getBills();
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
