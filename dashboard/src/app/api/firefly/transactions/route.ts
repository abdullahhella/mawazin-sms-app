import { type NextRequest } from "next/server";
import { getTransactions, createTransaction } from "@/lib/firefly-client";
import { jsonResponse, errorResponse, parseSearchParams } from "@/lib/api-helpers";
import type { FireflyTransactionPayload } from "@/types/firefly";
import { IS_MOCK_MODE, getMockTransactions } from "@/lib/mock-fixtures";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request);
    if (IS_MOCK_MODE) {
      return jsonResponse(
        getMockTransactions({
          start: params.start,
          end: params.end,
          type: params.type,
          limit: params.limit ? Number(params.limit) : undefined,
          accountId: params.accountId,
        }),
      );
    }
    const data = await getTransactions({
      start: params.start,
      end: params.end,
      type: params.type,
      limit: params.limit ? Number(params.limit) : undefined,
      accountId: params.accountId,
    });
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FireflyTransactionPayload;
    // Stamp every dashboard-originated transaction with source:dashboard
    const taggedBody: FireflyTransactionPayload = {
      ...body,
      transactions: (body.transactions ?? []).map((txn) => ({
        ...txn,
        tags: [...(txn.tags ?? []).filter((t) => t !== "source:dashboard"), "source:dashboard"],
      })),
    };
    const data = await createTransaction(taggedBody);
    return jsonResponse(data, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
