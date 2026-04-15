/**
 * Shared helpers for Next.js API route handlers.
 */
import { type NextRequest } from "next/server";

/** Return a JSON success response. */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return Response.json(data, { status });
}

/** Return a JSON error response. */
export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message, status }, { status });
}

/** Extract all query params from a NextRequest as a plain object. */
export function parseSearchParams(
  request: NextRequest,
): Record<string, string> {
  const result: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Validate an intake API key from the Authorization header.
 * Returns true if valid, false otherwise.
 * Reads INTAKE_API_KEY from process.env.
 */
export function validateApiKey(request: NextRequest): boolean {
  const expected = process.env.INTAKE_API_KEY;
  if (!expected) {
    // If no key is configured, reject all requests for safety
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header) return false;

  // Support "Bearer <key>" format
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : header.trim();

  return token === expected;
}
