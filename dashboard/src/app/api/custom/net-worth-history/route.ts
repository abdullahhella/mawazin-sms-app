import { type NextRequest } from "next/server";
import { getAccounts, getTransactions } from "@/lib/firefly-client";
import { jsonResponse, errorResponse, parseSearchParams } from "@/lib/api-helpers";
import { getMonthRanges } from "@/lib/date-utils";
import type { NetWorthPoint } from "@/types/app";
import { IS_MOCK_MODE, getMockNetWorth } from "@/lib/mock-fixtures";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request);
    const months = params.months ? Number(params.months) : 6;

    if (IS_MOCK_MODE) {
      return jsonResponse(getMockNetWorth(months));
    }

    // Step 1: Get all asset accounts and sum current balances
    const accountsRes = await getAccounts("asset", 100);
    const currentAssets = accountsRes.data.reduce((sum, account) => {
      if (account.attributes.include_net_worth && account.attributes.active) {
        return sum + parseFloat(account.attributes.current_balance);
      }
      return sum;
    }, 0);

    // For simplicity, liabilities = 0 (Firefly doesn't have a simple
    // liability account type in the same list; they would be "debt" type).
    // Current net worth = sum of asset balances.
    const currentNetWorth = currentAssets;

    // Step 2: Build monthly ranges
    const ranges = getMonthRanges(months);

    // Step 3: For each month, fetch transactions and compute historical balances.
    // We work backwards from current net worth.
    // For each month, deposits increase net worth, withdrawals decrease it.
    // So going backwards: prior_net = current_net - deposits + withdrawals
    const monthlyTransactions = await Promise.all(
      ranges.map((range) =>
        getTransactions({ start: range.start, end: range.end, limit: 500 }),
      ),
    );

    // Calculate net flow per month (deposits - withdrawals)
    const monthlyNetFlows = monthlyTransactions.map((txResponse) => {
      let deposits = 0;
      let withdrawals = 0;

      for (const group of txResponse.data) {
        for (const split of group.attributes.transactions) {
          const amount = parseFloat(split.amount);
          if (split.type === "deposit") {
            deposits += amount;
          } else if (split.type === "withdrawal") {
            withdrawals += amount;
          }
          // Transfers are internal, skip for net worth calculation
        }
      }

      return { deposits, withdrawals, netFlow: deposits - withdrawals };
    });

    // Step 4: Build net worth history working backwards from current
    const points: NetWorthPoint[] = [];
    let runningNetWorth = currentNetWorth;

    // Process from most recent to oldest
    for (let i = ranges.length - 1; i >= 0; i--) {
      const assets = Math.max(runningNetWorth, 0);
      const liabilities = Math.min(runningNetWorth, 0);

      points.unshift({
        date: ranges[i].start,
        assets,
        liabilities: Math.abs(liabilities),
        netWorth: runningNetWorth,
      });

      // Go back one month: subtract that month's net flow
      if (i > 0) {
        runningNetWorth -= monthlyNetFlows[i].netFlow;
      }
    }

    return jsonResponse(points);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
