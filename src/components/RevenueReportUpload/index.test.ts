import { describe, expect, it, vi } from 'vitest';
import {
  ACCEPTED_TYPES,
  MAX_FILE_SIZE_BYTES,
  RevenueReportUpload as RevenueReportUploadFromBarrel,
  simulatedUploader,
  type RevenueReportUploadProps,
  type UploadableFile,
} from './index';
import { RevenueReportUpload as RevenueReportUploadFromModule } from './RevenueReportUpload';

/**
 * Behaviour suite for the `RevenueReportUpload` barrel (`index.ts`).
 *
 * `index.ts` is the public entry point every consumer imports
 * (`import { RevenueReportUpload } from '../RevenueReportUpload'`), so a silent
 * rename or a dropped re-export breaks callers without touching the component
 * implementation. These tests pin the exported surface, the upload-policy
 * constants and the default uploader's progress contract.
 */

function makeFile(name: string, size = 16, type = 'application/pdf'): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('RevenueReportUpload barrel (index.ts)', () => {
  describe('re-exported runtime surface', () => {
    it('re-exports the exact component instance from RevenueReportUpload.tsx', () => {
      expect(RevenueReportUploadFromBarrel).toBe(RevenueReportUploadFromModule);
      expect(typeof RevenueReportUploadFromBarrel).toBe('function');
    });

    it('keeps the component displayName stable for devtools/tests', () => {
      expect(RevenueReportUploadFromBarrel.displayName).toBe('RevenueReportUpload');
    });

    it('exposes the uploader as a callable function', () => {
      expect(typeof simulatedUploader).toBe('function');
    });
  });

  describe('ACCEPTED_TYPES contract', () => {
    it('is the documented comma-separated allowlist', () => {
      expect(ACCEPTED_TYPES).toBe('.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg');
    });

    it('lists every entry as a dot-prefixed lower-case extension', () => {
      const entries = ACCEPTED_TYPES.split(',');

      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry).toMatch(/^\.[a-z0-9]+$/);
      }
    });

    it('contains no duplicates and no padding', () => {
      const entries = ACCEPTED_TYPES.split(',');

      expect(new Set(entries).size).toBe(entries.length);
      expect(entries.every((entry) => entry === entry.trim())).toBe(true);
    });

    it('covers documents and images but never scripts', () => {
      expect(ACCEPTED_TYPES).toContain('.pdf');
      expect(ACCEPTED_TYPES).toContain('.xlsx');
      expect(ACCEPTED_TYPES).toContain('.jpeg');
      expect(ACCEPTED_TYPES).not.toContain('.js');
      expect(ACCEPTED_TYPES).not.toContain('.html');
    });
  });

  describe('MAX_FILE_SIZE_BYTES contract', () => {
    it('is the documented 20 MB ceiling', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024);
      expect(Number.isInteger(MAX_FILE_SIZE_BYTES)).toBe(true);
    });
  });

  describe('simulatedUploader default implementation', () => {
    it('reports monotonically increasing progress and resolves exactly once at 100%', async () => {
      vi.useFakeTimers();
      const random = vi.spyOn(Math, 'random').mockReturnValue(0);
      try {
        const reported: number[] = [];
        const upload = simulatedUploader(makeFile('revenue.pdf'), (pct) => reported.push(pct));

        await vi.advanceTimersByTimeAsync(5_000);

        await expect(upload).resolves.toBeUndefined();
        expect(reported.length).toBeGreaterThan(1);
        expect(reported[reported.length - 1]).toBe(100);
        expect(reported).toEqual([...reported].sort((a, b) => a - b));
        expect(reported.every((pct) => Number.isInteger(pct) && pct >= 0 && pct <= 100)).toBe(true);
      } finally {
        random.mockRestore();
        vi.useRealTimers();
      }
    });

    it('starts from a 0→100 range rather than reporting the final value immediately', async () => {
      vi.useFakeTimers();
      const random = vi.spyOn(Math, 'random').mockReturnValue(0);
      try {
        const reported: number[] = [];
        const upload = simulatedUploader(makeFile('revenue.xlsx'), (pct) => reported.push(pct));

        await vi.advanceTimersByTimeAsync(100);

        expect(reported.length).toBeGreaterThan(0);
        expect(reported[0]).toBeLessThan(100);

        await vi.advanceTimersByTimeAsync(5_000);
        await upload;
      } finally {
        random.mockRestore();
        vi.useRealTimers();
      }
    });

    it('never rejects, so the queue can treat completion as success', async () => {
      vi.useFakeTimers();
      const random = vi.spyOn(Math, 'random').mockReturnValue(0);
      try {
        const upload = simulatedUploader(makeFile('revenue.png'), () => {});

        await vi.advanceTimersByTimeAsync(5_000);

        await expect(upload).resolves.toBeUndefined();
      } finally {
        random.mockRestore();
        vi.useRealTimers();
      }
    });
  });

  describe('exported types', () => {
    it('keeps RevenueReportUploadProps and UploadableFile assignable', () => {
      // Compile-time contract: these assignments fail `tsc`/`vite build` if the
      // barrel stops exporting the public prop and file shapes.
      const props: RevenueReportUploadProps = {
        notes: 'Q3 revenue report',
        onNotesChange: () => {},
        disabled: false,
      };
      const file: UploadableFile = {
        id: 'file-1',
        name: 'q3.pdf',
        size: 1024,
        status: 'uploading',
        progress: 40,
      };

      expect(props.notes).toBe('Q3 revenue report');
      expect(file.status).toBe('uploading');
      expect(file.progress).toBe(40);
    });
  });
});
