/**
 * Date range helpers for Firefly API queries.
 */
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  differenceInDays,
  isWithinInterval,
  parseISO,
  addDays,
} from "date-fns";

const DATE_FORMAT = "yyyy-MM-dd";

/** Returns { start, end } for the current calendar month. */
export function monthRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: format(startOfMonth(now), DATE_FORMAT),
    end: format(endOfMonth(now), DATE_FORMAT),
  };
}

/** Returns an array of { start, end } for the last N months (inclusive of current). */
export function getMonthRanges(months: number): Array<{ start: string; end: string; label: string }> {
  const now = new Date();
  const ranges: Array<{ start: string; end: string; label: string }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    ranges.push({
      start: format(startOfMonth(date), DATE_FORMAT),
      end: format(endOfMonth(date), DATE_FORMAT),
      label: format(date, "MMM yyyy"),
    });
  }

  return ranges;
}

/** Returns { start, end } for a range of N months ending at current month. */
export function getDateRangeForMonths(months: number): { start: string; end: string } {
  const now = new Date();
  return {
    start: format(startOfMonth(subMonths(now, months - 1)), DATE_FORMAT),
    end: format(endOfMonth(now), DATE_FORMAT),
  };
}

/** Check if a date string is within N days from today. */
export function isWithinDays(dateStr: string, days: number): boolean {
  const target = parseISO(dateStr);
  const now = new Date();
  return isWithinInterval(target, {
    start: now,
    end: addDays(now, days),
  });
}

/** Returns days until a future date. Negative if past. */
export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

/** Format a date for display: "Apr 2026" */
export function formatMonthYear(dateStr: string): string {
  return format(parseISO(dateStr), "MMM yyyy");
}

export function toDateString(date: Date): string {
  return format(date, DATE_FORMAT);
}
