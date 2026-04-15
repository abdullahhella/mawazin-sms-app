/**
 * RFC-4180-compliant CSV parser for Mawazin bulk-import.
 * No external dependencies. Handles: quoted fields, escaped quotes (""),
 * embedded commas/newlines, CRLF/LF, optional UTF-8 BOM.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParsedCsv = {
  headers: string[];    // first row
  rows: string[][];     // subsequent rows, each padded/truncated to headers.length
  raw: string[][];      // full grid including header row
};

export type TargetField = "sender" | "date" | "message" | "ignore";
export type ColumnMapping = Record<string, TargetField>; // source header -> target

export type NormalizedMessage = {
  sender: string;
  date: string;
  message: string;
};

// ---------------------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------------------

/**
 * Parse CSV text following RFC 4180.
 * Strips optional UTF-8 BOM. Normalises CRLF -> LF before tokenising.
 */
export function parseCsv(text: string): ParsedCsv {
  // Strip BOM
  const stripped = text.startsWith("\uFEFF") ? text.slice(1) : text;

  const raw = tokenise(stripped);

  if (raw.length === 0) {
    return { headers: [], rows: [], raw: [] };
  }

  const headers = raw[0];
  const width = headers.length;

  const rows = raw.slice(1).map((row) => {
    if (row.length === width) return row;
    if (row.length < width) {
      return [...row, ...Array<string>(width - row.length).fill("")];
    }
    return row.slice(0, width);
  });

  return { headers, rows, raw };
}

/** Tokenise raw CSV text into a 2-D array of strings. */
function tokenise(text: string): string[][] {
  const grid: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (ch === '"') {
      // Quoted field
      i++;
      while (i < len) {
        const qch = text[i];
        if (qch === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            // Escaped quote
            field += '"';
            i += 2;
          } else {
            // Closing quote
            i++;
            break;
          }
        } else {
          field += qch;
          i++;
        }
      }
    } else if (ch === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (ch === "\r" && i + 1 < len && text[i + 1] === "\n") {
      // CRLF
      row.push(field);
      field = "";
      grid.push(row);
      row = [];
      i += 2;
    } else if (ch === "\n" || ch === "\r") {
      row.push(field);
      field = "";
      grid.push(row);
      row = [];
      i++;
    } else {
      field += ch;
      i++;
    }
  }

  // Handle trailing content (no final newline)
  if (field !== "" || row.length > 0) {
    row.push(field);
    grid.push(row);
  }

  // Drop a single empty trailing row produced by a trailing newline
  if (
    grid.length > 0 &&
    grid[grid.length - 1].length === 1 &&
    grid[grid.length - 1][0] === ""
  ) {
    grid.pop();
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Delimiter detection
// ---------------------------------------------------------------------------

/** Scan first 3 non-blank lines; return the delimiter with the most consistent count. */
export function detectDelimiter(text: string): "," | ";" | "\t" | "|" {
  const candidates: Array<"," | ";" | "\t" | "|"> = [",", ";", "\t", "|"];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 3);

  if (lines.length === 0) return ",";

  // For each candidate count occurrences per line and pick the most consistent
  let bestDelim: "," | ";" | "\t" | "|" = ",";
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = lines.map((l) => l.split(delim).length - 1);
    const min = Math.min(...counts);
    const sum = counts.reduce((a, b) => a + b, 0);
    // Score: sum weighted by consistency (min > 0 means it appeared in every line)
    const score = min > 0 ? sum + min * 10 : sum;
    if (score > bestScore) {
      bestScore = score;
      bestDelim = delim;
    }
  }

  return bestDelim;
}

// ---------------------------------------------------------------------------
// Preview helper
// ---------------------------------------------------------------------------

/** Return up to `limit` rows as objects keyed by header name. */
export function toPreviewRows(
  parsed: ParsedCsv,
  limit = 10
): Record<string, string>[] {
  return parsed.rows.slice(0, limit).map((row) => {
    const obj: Record<string, string> = {};
    parsed.headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? "";
    });
    return obj;
  });
}

// ---------------------------------------------------------------------------
// Column mapping helpers
// ---------------------------------------------------------------------------

const SENDER_HINTS = ["sender", "from", "bank", "source", "contact"];
const DATE_HINTS = ["date", "received", "timestamp", "time", "datetime", "when"];
const MESSAGE_HINTS = ["body", "text", "message", "content", "msg", "sms"];

/**
 * Auto-guess a ColumnMapping from header names using simple heuristics.
 * Matching is case-insensitive. First unambiguous match wins per target field.
 */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const assigned = new Set<TargetField>();

  for (const header of headers) {
    const lower = header.toLowerCase();
    let matched: TargetField = "ignore";

    if (!assigned.has("sender") && SENDER_HINTS.some((h) => lower.includes(h))) {
      matched = "sender";
    } else if (!assigned.has("date") && DATE_HINTS.some((h) => lower.includes(h))) {
      matched = "date";
    } else if (!assigned.has("message") && MESSAGE_HINTS.some((h) => lower.includes(h))) {
      matched = "message";
    }

    if (matched !== "ignore") {
      assigned.add(matched);
    }
    mapping[header] = matched;
  }

  return mapping;
}

/**
 * Apply a ColumnMapping to a ParsedCsv, returning NormalizedMessage[].
 * Fields not mapped to a target field are dropped.
 */
export function applyMapping(
  parsed: ParsedCsv,
  mapping: ColumnMapping
): NormalizedMessage[] {
  return parsed.rows.map((row) => {
    const msg: NormalizedMessage = { sender: "", date: "", message: "" };

    parsed.headers.forEach((header, idx) => {
      const target = mapping[header];
      if (target && target !== "ignore") {
        msg[target] = row[idx] ?? "";
      }
    });

    return msg;
  });
}
