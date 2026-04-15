import { type NextRequest } from "next/server";
import { getAccounts, getTransactions, getBills } from "@/lib/firefly-client";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { monthRange, isWithinDays } from "@/lib/date-utils";
import { ALERT_THRESHOLDS } from "@/lib/constants";
import type { AlertItem } from "@/types/app";
import { IS_MOCK_MODE, getMockAlerts } from "@/lib/mock-fixtures";

export async function GET(_request: NextRequest) {
  try {
    if (IS_MOCK_MODE) {
      return jsonResponse(getMockAlerts());
    }
    const alerts: AlertItem[] = [];
    const now = new Date().toISOString();
    const { start, end } = monthRange();

    // Fetch data in parallel
    const [accountsRes, txResponse, billsRes] = await Promise.all([
      getAccounts("asset", 100),
      getTransactions({ start, end, limit: 200 }),
      getBills(),
    ]);

    // 1. Large transactions (> threshold) in current month
    for (const group of txResponse.data) {
      for (const split of group.attributes.transactions) {
        const amount = parseFloat(split.amount);
        if (amount > ALERT_THRESHOLDS.largeTransaction) {
          alerts.push({
            id: `large-tx-${group.id}-${split.order}`,
            type: "large-transaction",
            title: "Large Transaction",
            message: `${split.type === "withdrawal" ? "Spent" : "Received"} ${split.currency_symbol} ${amount.toFixed(2)} — ${split.description}`,
            severity: "info",
            createdAt: now,
            relatedId: group.id,
          });
        }
      }
    }

    // 2. Low balance accounts (< threshold)
    for (const account of accountsRes.data) {
      if (!account.attributes.active) continue;

      const balance = parseFloat(account.attributes.current_balance);
      if (balance < ALERT_THRESHOLDS.lowBalance) {
        alerts.push({
          id: `low-bal-${account.id}`,
          type: "low-balance",
          title: "Low Balance",
          message: `${account.attributes.name} balance is ${account.attributes.currency_symbol} ${balance.toFixed(2)}`,
          severity: balance < 0 ? "critical" : "warning",
          createdAt: now,
          relatedId: account.id,
        });
      }
    }

    // 3. Bills due within threshold days
    for (const bill of billsRes.data) {
      const { attributes } = bill;
      if (!attributes.active || !attributes.next_expected_match) continue;

      if (isWithinDays(attributes.next_expected_match, ALERT_THRESHOLDS.billDueSoon)) {
        const avgAmount =
          (parseFloat(attributes.amount_min) + parseFloat(attributes.amount_max)) / 2;

        alerts.push({
          id: `bill-due-${bill.id}`,
          type: "bill-due",
          title: "Bill Due Soon",
          message: `${attributes.name} (~${attributes.currency_code} ${avgAmount.toFixed(2)}) is due on ${attributes.next_expected_match}`,
          severity: "warning",
          createdAt: now,
          relatedId: bill.id,
        });
      }
    }

    return jsonResponse(alerts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
