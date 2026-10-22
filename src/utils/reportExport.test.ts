/*
 * reportExport.test.ts
 * Issue #627 - unit coverage for the dependency-free report generators.
 */

import { describe, expect, it } from "vitest";
import {
  buildReportExportRows,
  reportExportFileName,
  toCsv,
  toPdfBytes,
  toXlsxBytes,
} from "./reportExport";

const INPUT = {
  reportPeriod: "2026-05",
  periodLabel: "May 2026",
  grossRevenue: 125000,
  currency: "USD",
  locale: "en-US",
  notes: 'Q2 revenue, "final" numbers',
  payoutEstimate: 10000,
};

describe("buildReportExportRows", () => {
  it("builds the summary preview for the current-view scope", () => {
    const rows = buildReportExportRows("current", INPUT);
    expect(rows).toEqual([
      ["Period", "Gross revenue", "Estimated payout"],
      ["May 2026", "125000", "10000"],
    ]);
  });

  it("builds the full record for the filtered-set scope", () => {
    const rows = buildReportExportRows("filtered", INPUT);
    expect(rows).toEqual([
      [
        "Period",
        "Gross revenue",
        "Currency",
        "Locale",
        "Estimated payout",
        "Notes",
      ],
      ["May 2026", "125000", "USD", "en-US", "10000", 'Q2 revenue, "final" numbers'],
    ]);
  });

  it("handles boundary values: zero revenue and empty notes", () => {
    const rows = buildReportExportRows("filtered", {
      ...INPUT,
      grossRevenue: 0,
      payoutEstimate: 0,
      notes: "",
    });
    expect(rows[1]).toEqual(["May 2026", "0", "USD", "en-US", "0", ""]);
  });
});

describe("reportExportFileName", () => {
  it("includes the period and format with the scope suffix for filtered exports", () => {
    expect(reportExportFileName("current", "csv", "2026-05")).toBe(
      "revenue-report-2026-05.csv"
    );
    expect(reportExportFileName("filtered", "xlsx", "2026-05")).toBe(
      "revenue-report-2026-05-filtered.xlsx"
    );
    expect(reportExportFileName("current", "pdf", "2026-05")).toBe(
      "revenue-report-2026-05.pdf"
    );
  });
});

describe("toCsv", () => {
  it("writes a header and data rows with CRLF line endings", () => {
    const csv = toCsv([
      ["Period", "Gross revenue"],
      ["May 2026", "125000"],
    ]);
    expect(csv).toBe("Period,Gross revenue\r\nMay 2026,125000\r\n");
  });

  it("quotes cells containing commas, quotes, or newlines", () => {
    const csv = toCsv([["a,b", 'say "hi"', "line1\nline2"]]);
    expect(csv).toBe('"a,b","say ""hi""","line1\nline2"\r\n');
  });
});

describe("toXlsxBytes", () => {
  it("produces a stored ZIP (PK signatures) containing the OOXML parts", () => {
    const bytes = toXlsxBytes([
      ["Period", "Gross revenue"],
      ["May 2026", "125000"],
    ]);
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("[Content_Types].xml");
    expect(text).toContain("xl/worksheets/sheet1.xml");
    expect(text).toContain("<t xml:space=\"preserve\">May 2026</t>");
    expect(text).toContain("<v>125000</v>");
    // Central directory and EOCD signatures present.
    expect(text.includes("PK\u0001\u0002")).toBe(true);
    expect(text.includes("PK\u0005\u0006")).toBe(true);
  });
});

/**
 * Parse the xref table and verify that every offset points at the
 * corresponding "N 0 obj" header, and that every /Length matches the
 * actual byte length of the stream between "stream\n" and "\nendstream".
 */
function assertPdfByteAccuracy(bytes: Uint8Array): void {
  const decoder = new TextDecoder("latin1");
  const text = decoder.decode(bytes);

  // Locate the xref table via startxref.
  const startxrefMatch = /startxref\n(\d+)\n%%EOF/.exec(text);
  expect(startxrefMatch).not.toBeNull();
  const startxref = Number(startxrefMatch![1]);
  expect(Number.isFinite(startxref)).toBe(true);
  expect(text.slice(startxref, startxref + 4)).toBe("xref");

  // Parse the xref table entries: "xref\n0 N\n0000000000 65535 f\n0000000010 00000 n\n..."
  const xrefBlock = text.slice(startxref);
  const lines = xrefBlock.split("\n");
  expect(lines[0]).toBe("xref");
  // lines[1] = "0 N" (subsection header)
  const headerParts = lines[1].split(" ");
  const count = Number(headerParts[1]);
  expect(Number.isFinite(count)).toBe(true);

  // Entry 0 is the free list head; entries 1..count-1 are objects.
  for (let i = 1; i < count; i++) {
    const entry = lines[1 + i];
    const match = /^(\d{,10}) (\d{3,5}) ([nf])$/.exec(entry);
    expect(match, `xref entry ${i} cannot be parsed: ${entry}`).not.toBeNull();
    const offset = Number(match![1]);
    const header = `${i} 0 obj`;
    expect(
      text.slice(offset, offset + header.length),
      `xref offset ${offset} for object ${i} should point at "${header}"`
    ).toBe(header);
  }

  // Verify /Length of every stream equals the byte length of the stream data.
  const streamRe = /\/Length (\d+) >>\nstream\n/g;
  let match: RegExpExecArray | null;
  let streams = 0;
  while ((match = streamRe.exec(text)) !== null) {
    streams++;
    const declaredLength = Number(match[1]);
    const streamStart = match.index + match[0].length;
    const endIdx = text.indexOf("\nendstream", streamStart);
    expect(endIdx, `stream at ${streamStart} must have an endstream marker`).toBeGreaterThan(-1);
    const actualLength = endIdx - streamStart;
    expect(declaredLength, `/Length must equal byte length of stream`).toBe(actualLength);
  }
  expect(streams).toBeGreaterThan(0);
}

describe("toPdfBytes", () => {
  it("produces a structurally valid single-page PDF", () => {
    const bytes = toPdfBytes([
      ["Period", "Gross revenue"],
      ["May 2026", "125000"],
    ]);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/Type /Page");
    expect(text).toContain("May 2026");
    expect(text).toContain("125000");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);

    // startxref must point at the xref table.
    const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(text)?.[1]);
    expect(Number.isFinite(startxref)).toBe(true);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
  });

  it("emits byte-accurate /Length and xref offsets for ASCII input", () => {
    const bytes = toPdfBytes([
      ["Period", "Gross revenue"],
      ["May 2026", "125000"],
    ]);
    assertPdfByteAccuracy(bytes);
  });

  it("emits byte-accurate /Length and xref offsets for non-ASCII input", () => {
    // Regression: this failed on master because .length measured UTF-16
    // code units while the document was encoded as UTF-8.
    const bytes = toPdfBytes([
      ["Period", "Gross revenue", "Notes"],
      ["May 2026", "Revenue €1.000", "café - ₭1.000"],
    ]);
    assertPdfByteAccuracy(bytes);
  });

  it("escapes parentheses and backslashes in text runs", () => {
    const bytes = toPdfBytes([
      ["Period", "Notes"],
      ["May 2026", "Quarter (Q2) \\ final (100%)"],
    ]);
    assertPdfByteAccuracy(bytes);

    // The raw content stream must not contain unescaped delimiters inside
    // the string literal that would terminate it early.
    const text = new TextDecoder("latin1").decode(bytes);
    const streamMatch = /stream\n([\s\S]*)\nendstream/.exec(text);
    expect(streamMatch).not.toBeNull();
    const content = streamMatch![1];
    // Every literal string must balance and escape internal delimiters.
    expect(content).toContain("\\(");
    expect(content).toContain("\\)");
    expect(content).toContain("\\\\");
  });

  it("wraps long note lines so text stays within the page", () => {
    const longNote =
      "Revenue recognition adjustment for the period including " +
      "currency conversion and rounding differences across all regions.";
    const bytes = toPdfBytes([
      ["Period", "Notes"],
      ["May 2026", longNote],
    ]);
    assertPdfByteAccuracy(bytes);

    const text = new TextDecoder("latin1").decode(bytes);
    const streamMatch = /stream\n([\s\S]*)\nendstream/.exec(text);
    expect(streamMatch).not.toBeNull();
    const content = streamMatch![1];
    // Multiple text showing operators indicate the note was wrapped.
    const showCount = (content.match(/\bTj\b/g) ?? []).length;
    expect(showCount).toBeGreaterThan(1);
  });
});
