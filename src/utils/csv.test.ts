import { describe, it, expect } from 'vitest';
import { parseCsv } from './csv';
import { toCsv } from './reportExport';

describe('parseCsv', () => {
  describe('basic parsing and line endings', () => {
    it('parses LF-delimited CSV with 1-based row numbers', () => {
      const csv = 'a,b,c\n1,2,3\n4,5,6';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['a', 'b', 'c'] },
        { rowNumber: 2, cells: ['1', '2', '3'] },
        { rowNumber: 3, cells: ['4', '5', '6'] },
      ]);
    });

    it('parses CRLF-delimited CSV', () => {
      const csv = 'a,b\r\n1,2\r\n3,4\r\n';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['a', 'b'] },
        { rowNumber: 2, cells: ['1', '2'] },
        { rowNumber: 3, cells: ['3', '4'] },
      ]);
    });

    it('parses standalone CR line endings', () => {
      const csv = 'a,b\r1,2\r3,4';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['a', 'b'] },
        { rowNumber: 2, cells: ['1', '2'] },
        { rowNumber: 3, cells: ['3', '4'] },
      ]);
    });

    it('strips UTF-8 BOM from the start of input', () => {
      const csv = '\uFEFFaddress,checksum\n0xABC,hash123';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['address', 'checksum'] },
        { rowNumber: 2, cells: ['0xABC', 'hash123'] },
      ]);
    });
  });

  describe('quotes, escaped quotes, commas, and embedded newlines', () => {
    it('preserves commas inside quoted fields', () => {
      const csv = 'name,note\nAlice,"Hello, world"\nBob,"1,000,000"';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['name', 'note'] },
        { rowNumber: 2, cells: ['Alice', 'Hello, world'] },
        { rowNumber: 3, cells: ['Bob', '1,000,000'] },
      ]);
    });

    it('unescapes doubled quotes inside quoted fields', () => {
      const csv = 'col1,col2\n"He said ""hello""","""quoted"""';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['col1', 'col2'] },
        { rowNumber: 2, cells: ['He said "hello"', '"quoted"'] },
      ]);
    });

    it('preserves LF newlines inside quoted fields and tracks source row numbers', () => {
      const csv = 'address,notes\n0xABC,"line 1\nline 2\nline 3"\n0xDEF,"single line"';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['address', 'notes'] },
        { rowNumber: 2, cells: ['0xABC', 'line 1\nline 2\nline 3'] },
        { rowNumber: 5, cells: ['0xDEF', 'single line'] },
      ]);
    });

    it('preserves CRLF newlines inside quoted fields and tracks source row numbers', () => {
      const csv = 'address,notes\r\n0xABC,"line 1\r\nline 2"\r\n0xDEF,"ok"\r\n';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['address', 'notes'] },
        { rowNumber: 2, cells: ['0xABC', 'line 1\r\nline 2'] },
        { rowNumber: 4, cells: ['0xDEF', 'ok'] },
      ]);
    });

    it('preserves standalone CR inside quoted fields and tracks source row numbers', () => {
      const csv = 'a,b\n"x\ry",z\n1,2';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['a', 'b'] },
        { rowNumber: 2, cells: ['x\ry', 'z'] },
        { rowNumber: 4, cells: ['1', '2'] },
      ]);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty or whitespace-only input', () => {
      expect(parseCsv('')).toEqual([]);
      expect(parseCsv('\uFEFF')).toEqual([]);
      expect(parseCsv('\n\r\n   \n')).toEqual([]);
    });

    it('handles empty cells and trailing commas', () => {
      const csv = 'a,,c\n,middle,\n,,';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['a', '', 'c'] },
        { rowNumber: 2, cells: ['', 'middle', ''] },
        { rowNumber: 3, cells: ['', '', ''] },
      ]);
    });

    it('preserves intentionally quoted empty single-column row', () => {
      const csv = 'col\n""\nval';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['col'] },
        { rowNumber: 2, cells: [''] },
        { rowNumber: 3, cells: ['val'] },
      ]);
    });

    it('skips blank lines by default while preserving accurate row numbers', () => {
      const csv = 'a,b\n\n1,2\n   \n3,4';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['a', 'b'] },
        { rowNumber: 3, cells: ['1', '2'] },
        { rowNumber: 5, cells: ['3', '4'] },
      ]);
    });

    it('can retain blank lines when skipEmptyRows is false', () => {
      const csv = 'a,b\n\n1,2';
      expect(parseCsv(csv, { skipEmptyRows: false })).toEqual([
        { rowNumber: 1, cells: ['a', 'b'] },
        { rowNumber: 2, cells: [''] },
        { rowNumber: 3, cells: ['1', '2'] },
      ]);
    });

    it('supports trim option without altering internal newlines or commas', () => {
      const csv = ' address , notes \n 0xABC ," line 1,\nline 2 "';
      expect(parseCsv(csv, { trim: false })).toEqual([
        { rowNumber: 1, cells: [' address ', ' notes '] },
        { rowNumber: 2, cells: [' 0xABC ', ' line 1,\nline 2 '] },
      ]);
      expect(parseCsv(csv, { trim: true })).toEqual([
        { rowNumber: 1, cells: ['address', 'notes'] },
        { rowNumber: 2, cells: ['0xABC', 'line 1,\nline 2'] },
      ]);
    });

    it('handles unclosed quote at EOF gracefully', () => {
      const csv = 'a,b\n1,"unterminated';
      expect(parseCsv(csv)).toEqual([
        { rowNumber: 1, cells: ['a', 'b'] },
        { rowNumber: 2, cells: ['1', 'unterminated'] },
      ]);
    });
  });

  describe('round-trip symmetry with toCsv', () => {
    it('round-trips simple and complex cells including commas, quotes, and newlines', () => {
      const original: string[][] = [
        ['Period', 'Gross revenue', 'Currency', 'Notes'],
        ['2026-Q1', '12500.50', 'USD', 'Normal note'],
        ['2026-Q2', '9800', 'EUR', 'Includes "special", multi-line\nnote with\r\nCRLF'],
        ['2026-Q3', '0', 'USD', ''],
      ];

      const serialized = toCsv(original);
      const parsed = parseCsv(serialized).map((r) => r.cells);

      expect(parsed).toEqual(original);
    });

    it('round-trips empty dataset', () => {
      const serialized = toCsv([]);
      expect(parseCsv(serialized)).toEqual([]);
    });
  });
});
