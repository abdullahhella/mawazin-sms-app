import { type NextRequest } from "next/server";
import { getBills } from "@/lib/firefly-client";
import { jsonResponse, errorResponse, parseSearchParams } from "@/lib/api-helpers";
import { isWithinDays, daysUntil } from "@/lib/date-utils";
import type { UpcomingBill } from "@/types/app";
import { IS_MOCK_MODE, getMockUpcomingBills } from "@/lib/mock-fixtures";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request);
    const days = params.days ? Number(params.days) : 14;

    if (IS_MOCK_MODE) {
      return jsonResponse(getMockUpcomingBills(days));
    }

    const billsResponse = await getBills();

    const upcoming: UpcomingBill[] = [];

    for (const bill of billsResponse.data) {
      const { attributes } = bill;

      if (!attributes.active || !attributes.next_expected_match) {
        continue;
      }

      if (isWithinDays(attributes.next_expected_match, days)) {
        const avgAmount =
          (parseFloat(attributes.amount_min) + parseFloat(attributes.amount_max)) / 2;

        upcoming.push({
          id: bill.id,
          name: attributes.name,
          amount: avgAmount,
          dueDate: attributes.next_expected_match,
          daysUntilDue: daysUntil(attributes.next_expected_match),
          currencyCode: attributes.currency_code,
        });
      }
    }

    // Sort by due date (soonest first)
    upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return jsonResponse(upcoming);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
