import { describe, expect, it } from 'vitest';
import type { DocumentVersion } from './types';
import { computeMockDiff, formatBytes } from './utils';

const baseVersion: DocumentVersion = {
  id: 'v1',
  versionLabel: 'v1',
  fileName: 'old.pdf',
  fileType: 'pdf',
  fileSizeBytes: 1024,
  uploadedBy: { id: 'user-1', name: 'Alex Morgan' },
  uploadedAt: '2025-01-15T12:00:00.000Z',
};

const makeVersion = (overrides: Partial<DocumentVersion> = {}): DocumentVersion => ({
  ...baseVersion,
  ...overrides,
});

describe('formatBytes', () => {
  it('formats zero without scaling', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats byte and kilobyte values', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('rounds to two decimals and removes trailing zeros', () => {
    expect(formatBytes(1234)).toBe('1.21 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('scales through larger units and caps at terabytes', () => {
    expect(formatBytes(1024 ** 2)).toBe('1 MB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5 GB');
    expect(formatBytes(1024 ** 4)).toBe('1 TB');
    expect(formatBytes(1024 ** 5)).toBe('1024 TB');
  });
});

describe('computeMockDiff', () => {
  it('summarizes added bytes, lines, and pages', () => {
    const oldVersion = makeVersion({ lineCount: 20, pageCount: 4 });
    const newVersion = makeVersion({
      id: 'v2',
      versionLabel: 'v2',
      fileSizeBytes: 2048,
      lineCount: 24,
      pageCount: 5,
    });

    expect(computeMockDiff(oldVersion, newVersion)).toEqual({
      bytesAdded: 1024,
      bytesRemoved: 0,
      linesAdded: 4,
      linesRemoved: 0,
      pagesAdded: 1,
      pagesRemoved: 0,
      highConfidenceMatch: true,
      summaryText: '1 KB added, 0 B removed · 4 lines +, 0 lines − · 1 pages +, 0 pages −',
      fieldsChanged: undefined,
    });
  });

  it('summarizes removed bytes, lines, and pages', () => {
    const oldVersion = makeVersion({
      fileSizeBytes: 3072,
      lineCount: 30,
      pageCount: 6,
    });
    const newVersion = makeVersion({
      id: 'v2',
      fileSizeBytes: 1024,
      lineCount: 10,
      pageCount: 2,
    });

    const result = computeMockDiff(oldVersion, newVersion);

    expect(result.bytesAdded).toBe(0);
    expect(result.bytesRemoved).toBe(2048);
    expect(result.linesAdded).toBe(0);
    expect(result.linesRemoved).toBe(20);
    expect(result.pagesAdded).toBe(0);
    expect(result.pagesRemoved).toBe(4);
    expect(result.summaryText).toBe('0 B added, 2 KB removed · 0 lines +, 20 lines − · 0 pages +, 4 pages −');
  });

  it('omits line and page counts when versions do not provide them', () => {
    const result = computeMockDiff(
      baseVersion,
      makeVersion({ id: 'v2', fileSizeBytes: 2048 }),
    );

    expect(result.linesAdded).toBeUndefined();
    expect(result.linesRemoved).toBeUndefined();
    expect(result.pagesAdded).toBeUndefined();
    expect(result.pagesRemoved).toBeUndefined();
    expect(result.summaryText).toBe('1 KB added, 0 B removed');
  });

  it('omits page summary when counts are present but unchanged', () => {
    const result = computeMockDiff(
      makeVersion({ lineCount: 20, pageCount: 4 }),
      makeVersion({ id: 'v2', lineCount: 20, pageCount: 4 }),
    );

    expect(result.summaryText).toBe('0 lines +, 0 lines −');
  });

  it('reports unchanged files when there are no counts or size change', () => {
    const result = computeMockDiff(baseVersion, makeVersion({ id: 'v2' }));

    expect(result).toEqual({
      bytesAdded: 0,
      bytesRemoved: 0,
      linesAdded: undefined,
      linesRemoved: undefined,
      pagesAdded: undefined,
      pagesRemoved: undefined,
      highConfidenceMatch: true,
      summaryText: 'File size and contents unchanged.',
      fieldsChanged: undefined,
    });
  });
});
