import { type NextRequest } from "next/server";

export interface PendingIntakeItem {
  id: string;
  rawText: string;
  parsedIntent: string;
  confidence: number;
  createdAt: string;
  status: "pending-review";
}

const MOCK_ITEMS: PendingIntakeItem[] = [
  {
    id: "pi-001",
    rawText: "paid 85 riyals at Panda supermarket yesterday",
    parsedIntent: "withdrawal • Groceries • SAR 85",
    confidence: 0.72,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending-review",
  },
  {
    id: "pi-002",
    rawText: "transferred 2000 to Ahmed for the trip",
    parsedIntent: "transfer • SAR 2,000 → Ahmed",
    confidence: 0.61,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending-review",
  },
  {
    id: "pi-003",
    rawText: "starbucks 34 SAR",
    parsedIntent: "withdrawal • Dining • SAR 34",
    confidence: 0.55,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending-review",
  },
];

export async function GET(_request: NextRequest) {
  if (process.env.MOCK_MODE === "true") {
    return Response.json({ data: MOCK_ITEMS }, { status: 200 });
  }

  return Response.json(
    {
      error: "Pending actions endpoint not implemented",
      status: 501,
      docs: "GET -> returns list of pending intake actions awaiting review",
    },
    { status: 501 },
  );
}

export async function PATCH(_request: NextRequest) {
  return Response.json(
    {
      error: "Pending actions endpoint not implemented",
      status: 501,
      docs: "PATCH { id, action: 'confirm' | 'reject' | 'edit', data? } -> resolves pending action",
    },
    { status: 501 },
  );
}
