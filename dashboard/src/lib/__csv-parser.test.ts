/**
 * Inline unit tests for csv-parser.ts.
 * Run with:  npx tsx src/lib/__csv-parser.test.ts
 * No test framework required — uses console.assert + manual reporting.
 */

import {
  parseCsv,
  detectDelimiter,
  toPreviewRows,
  guessMapping,
  applyMapping,
} from "./csv-parser";

// ---------------------------------------------------------------------------
// Micro test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL  ${name}\n        ${message}`);
    failed++;
  }
}

function expect(value: unknown) {
  return {
    toBe(expected: unknown) {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
    toEqual(expected: unknown) {
      const a = JSON.stringify(value);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b}, got ${a}`);
      }
    },
    toHaveLength(n: number) {
      const arr = value as unknown[];
      if (arr.length !== n) {
        throw new Error(`Expected length ${n}, got ${arr.length}`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log("\ncsv-parser tests\n");

// 1. Simple CSV
test("simple 2-column CSV", () => {
  const result = parseCsv("a,b\n1,2\n3,4");
  expect(result.headers).toEqual(["a", "b"]);
  expect(result.rows).toEqual([["1", "2"], ["3", "4"]]);
});

// 2. CRLF line endings
test("CRLF line endings", () => {
  const result = parseCsv("name,age\r\nAlice,30\r\nBob,25\r\n");
  expect(result.headers).toEqual(["name", "age"]);
  expect(result.rows).toHaveLength(2);
  expect(result.rows[0]).toEqual(["Alice", "30"]);
});

// 3. Quoted field with embedded comma
test("quoted field with embedded comma", () => {
  const result = parseCsv('a,b\n"hello, world",2');
  expect(result.rows[0][0]).toBe("hello, world");
  expect(result.rows[0][1]).toBe("2");
});

// 4. Embedded newline inside quoted field
test("quoted field with embedded newline", () => {
  const result = parseCsv('a,b\n"line1\nline2",end');
  expect(result.rows[0][0]).toBe("line1\nline2");
  expect(result.rows[0][1]).toBe("end");
});

// 5. Escaped quote inside quoted field
test('escaped quote "" inside quoted field', () => {
  const result = parseCsv('a,b\n"say ""hi""",x');
  expect(result.rows[0][0]).toBe('say "hi"');
});

// 6. Trailing newline does not produce extra row
test("trailing newline produces no extra row", () => {
  const result = parseCsv("a,b\n1,2\n");
  expect(result.rows).toHaveLength(1);
});

// 7. UTF-8 BOM stripped
test("UTF-8 BOM is stripped from headers", () => {
  const result = parseCsv("\uFEFFcol1,col2\nv1,v2");
  expect(result.headers[0]).toBe("col1");
});

// 8. Row shorter than header is padded
test("short row is padded with empty strings", () => {
  const result = parseCsv("a,b,c\n1,2");
  expect(result.rows[0]).toEqual(["1", "2", ""]);
});

// 9. Row longer than header is truncated
test("long row is truncated to header length", () => {
  const result = parseCsv("a,b\n1,2,3,4");
  expect(result.rows[0]).toHaveLength(2);
  expect(result.rows[0]).toEqual(["1", "2"]);
});

// 10. raw includes header row
test("raw includes header row", () => {
  const result = parseCsv("x,y\n10,20");
  expect(result.raw).toHaveLength(2);
  expect(result.raw[0]).toEqual(["x", "y"]);
});

// 11. detectDelimiter — semicolon
test("detectDelimiter picks semicolon", () => {
  const csv = "a;b;c\n1;2;3\n4;5;6";
  expect(detectDelimiter(csv)).toBe(";");
});

// 12. detectDelimiter — tab
test("detectDelimiter picks tab", () => {
  const csv = "a\tb\tc\n1\t2\t3\n4\t5\t6";
  expect(detectDelimiter(csv)).toBe("\t");
});

// 13. detectDelimiter — pipe
test("detectDelimiter picks pipe", () => {
  const csv = "a|b|c\n1|2|3\n4|5|6";
  expect(detectDelimiter(csv)).toBe("|");
});

// 14. toPreviewRows returns keyed objects
test("toPreviewRows returns Record<string,string>[]", () => {
  const parsed = parseCsv("Name,Score\nAlice,95\nBob,87");
  const preview = toPreviewRows(parsed, 1);
  expect(preview).toHaveLength(1);
  expect(preview[0]["Name"]).toBe("Alice");
  expect(preview[0]["Score"]).toBe("95");
});

// 15. guessMapping — STC Bank headers
test("guessMapping maps Sender,Received,Body correctly", () => {
  const mapping = guessMapping(["Sender", "Received", "Body"]);
  expect(mapping["Sender"]).toBe("sender");
  expect(mapping["Received"]).toBe("date");
  expect(mapping["Body"]).toBe("message");
});

// 16. guessMapping — Apple Messages headers
test("guessMapping maps timestamp,sender,text correctly", () => {
  const mapping = guessMapping(["timestamp", "sender", "text"]);
  expect(mapping["timestamp"]).toBe("date");
  expect(mapping["sender"]).toBe("sender");
  expect(mapping["text"]).toBe("message");
});

// 17. guessMapping — extra column mapped to ignore
test("guessMapping maps unknown column to ignore", () => {
  const mapping = guessMapping(["Date", "From", "Message", "Extra Column"]);
  expect(mapping["Extra Column"]).toBe("ignore");
});

// 18. applyMapping returns NormalizedMessage[]
test("applyMapping returns normalised messages", () => {
  const parsed = parseCsv("Sender,Received,Body\nSTC Bank,15-Apr-2026,Test message");
  const mapping = guessMapping(parsed.headers);
  const result = applyMapping(parsed, mapping);
  expect(result).toHaveLength(1);
  expect(result[0].sender).toBe("STC Bank");
  expect(result[0].date).toBe("15-Apr-2026");
  expect(result[0].message).toBe("Test message");
});

// 19. applyMapping with ignore field excluded from output
test("applyMapping ignores extra columns", () => {
  const parsed = parseCsv("Date,From,Message,Extra\n15/04/2026,ANB,Hello,PROCESSED");
  const mapping = guessMapping(parsed.headers);
  const result = applyMapping(parsed, mapping);
  expect(result[0].sender).toBe("ANB");
  expect(result[0].date).toBe("15/04/2026");
  expect(result[0].message).toBe("Hello");
});

// 20. empty CSV returns empty arrays
test("empty string returns empty ParsedCsv", () => {
  const result = parseCsv("");
  expect(result.headers).toEqual([]);
  expect(result.rows).toEqual([]);
  expect(result.raw).toEqual([]);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  process.exit(1);
}
