/**
 * reportExport.test.ts
 * Issue #627 – unit coverage for the dependency-free report generators.
 * Security harden – formula injection mitigation (CWE-1236).
 */

import { describe, expect, it } from "vitest";
import {
  buildReportExportRows,
  escapeCsvCell,
  reportExportFileName,
  sanitizeCsvCell,
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

describe("sanitizeCsvCell and escapeCsvCell", () => {
  it("neutralises each dangerous prefix with a single quote prefix", () => {
    expect(escapeCsvCell("=SUM(A1:B1)")).toBe("'=SUM(A1:B1)");
    expect(escapeCsvCell("+12345")).toBe("'+12345");
    expect(escapeCsvCell("-100")).toBe("'-100");
    expect(escapeCsvCell("@admin")).toBe("'@admin");
    expect(escapeCsvCell("\tcalc")).toBe("'\tcalc");
    expect(escapeCsvCell("\rcalc")).toBe('"\'\rcalc"');

    expect(sanitizeCsvCell("=SUM(A1:B1)")).toBe("'=SUM(A1:B1)");
    expect(sanitizeCsvCell("+12345")).toBe("'+12345");
    expect(sanitizeCsvCell("-100")).toBe("'-100");
    expect(sanitizeCsvCell("@admin")).toBe("'@admin");
    expect(sanitizeCsvCell("\tcalc")).toBe("'\tcalc");
    expect(sanitizeCsvCell("\rcalc")).toBe("'\rcalc");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeCsvCell("May 2026")).toBe("May 2026");
    expect(escapeCsvCell("USD")).toBe("USD");
    expect(escapeCsvCell("Revenue Report")).toBe("Revenue Report");
    expect(escapeCsvCell("")).toBe("");
  });

  it("quotes cells containing commas, quotes, or newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("applies quoting rules after neutralizing dangerous prefixes", () => {
    expect(
      escapeCsvCell('=HYPERLINK("http://example.invalid","click")')
    ).toBe('"\'=HYPERLINK(""http://example.invalid"",""click"")"');
    expect(escapeCsvCell("+1,000")).toBe('"\'+1,000"');
    expect(escapeCsvCell('@SUM("A","B")')).toBe('"\'@SUM(""A"",""B"")"');
  });

  it("leaves numeric amounts unchanged when marked or passed as numbers", () => {
    expect(escapeCsvCell(125000)).toBe("125000");
    expect(escapeCsvCell(-125000)).toBe("-125000");
    expect(escapeCsvCell("-125000", true)).toBe("-125000");
    expect(escapeCsvCell("-125000", { isNumeric: true })).toBe("-125000");
    expect(escapeCsvCell("125000", true)).toBe("125000");
    expect(escapeCsvCell("0", true)).toBe("0");
    expect(escapeCsvCell(0)).toBe("0");

    expect(sanitizeCsvCell(-5000)).toBe("-5000");
    expect(sanitizeCsvCell("-5000", true)).toBe("-5000");
    expect(sanitizeCsvCell("-5000", false)).toBe("'-5000");
    expect(sanitizeCsvCell("-5000", { isNumeric: false })).toBe("'-5000");
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
    const csv = toCsv([['a,b', 'say "hi"', "line1\nline2"]]);
    expect(csv).toBe('"a,b","say ""hi""","line1\nline2"\r\n');
  });

  it("distinguishes numeric amount columns from user string columns", () => {
    const rows = [
      ["Period", "Gross revenue", "Estimated payout", "Notes"],
      ["May 2026", "-125000", "-10000", "-500 adjustment"],
    ];
    const csv = toCsv(rows);
    expect(csv).toBe(
      "Period,Gross revenue,Estimated payout,Notes\r\nMay 2026,-125000,-10000,'-500 adjustment\r\n"
    );
  });

  it("supports explicit numeric column configuration", () => {
    const rows = [
      ["Code", "Balance"],
      ["-A1", "-99.99"],
    ];
    const csv = toCsv(rows, { numericColumns: ["Balance"] });
    expect(csv).toBe("Code,Balance\r\n'-A1,-99.99\r\n");
  });
});

describe("regression: formula injection in export payload (CWE-1236)", () => {
  it("neutralises formula in notes while preserving negative numeric columns", () => {
    const rows = buildReportExportRows("filtered", {
      ...INPUT,
      grossRevenue: -50000,
      payoutEstimate: -2500,
      notes: '=HYPERLINK("http://example.invalid","click")',
    });
    const csv = toCsv(rows);

    // Negative amounts remain numeric
    expect(csv).toContain(",-50000,");
    expect(csv).toContain(",-2500,");

    // Notes cell is neutralised as literal text and not an executable spreadsheet formula
    expect(csv).toContain(
      '"\'=HYPERLINK(""http://example.invalid"",""click"")"'
    );
    expect(csv).not.toContain(
      '"=HYPERLINK(""http://example.invalid"",""click"")"'
    );
  });

  it("neutralises all dangerous formula prefixes in user-provided notes", () => {
    const dangerousNotes = [
      ["=SUM(1,2)", "'=SUM(1,2)"],
      ["+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0"],
      ["-2+3+cmd", "'-2+3+cmd"],
      ["@SUM(1,2)", '"\'@SUM(1,2)"'],
      ["\talert(1)", "'\talert(1)"],
      ["\rprompt(1)", '"\'\rprompt(1)"'],
    ];

    for (const [raw, expected] of dangerousNotes) {
      const rows = buildReportExportRows("filtered", {
        ...INPUT,
        notes: raw,
      });
      const csv = toCsv(rows);
      expect(csv).toContain(expected);
    }
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
});
