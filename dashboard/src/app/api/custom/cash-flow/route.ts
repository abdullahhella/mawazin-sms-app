import { type NextRequest } from "next/server";
import { getTransactions } from "@/lib/firefly-client";
import { jsonResponse, errorResponse, parseSearchParams } from "@/lib/api-helpers";
import { monthRange } from "@/lib/date-utils";
import type { CashFlowData } from "@/types/app";
import { IS_MOCK_MODE, getMockCashFlow } from "@/lib/mock-fixtures";

export async function GET(request: NextRequest) {
  try {
    if (IS_MOCK_MODE) {
      return jsonResponse(getMockCashFlow());
    }
    const params = parseSearchParams(request);

    // Default to current month
    const defaults = monthRange();
    const start = params.start || defaults.start;
    const end = params.end || defaults.end;

    const txResponse = await getTransactions({ start, end, limit: 500 });

    let income = 0;
    let expenses = 0;
    const byCategory: Record<string, number> = {};

    for (const group of txResponse.data) {
      for (const split of group.attributes.transactions) {
        const amount = parseFloat(split.amount);

        if (split.type === "deposit") {
          income += amount;
        } else if (split.type === "withdrawal") {
          expenses += amount;

          // Group expenses by category
          const category = split.category_name || "Uncategorized";
          byCategory[category] = (byCategory[category] || 0) + amount;
        }
        // Transfers are excluded from cash flow
      }
    }

    const result: CashFlowData = {
      income,
      expenses,
      net: income - expenses,
      byCategory,
    };

    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
