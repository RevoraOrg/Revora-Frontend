import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'validate-terminology.js');
const { findViolations } = createRequire(import.meta.url)('./validate-terminology.js');
const fixture = (name: string) => readFileSync(join(here, 'fixtures', name), 'utf8');

describe('findViolations', () => {
  it('allows approved copy, line/block comments, and documentation URLs', () => {
    expect(findViolations(fixture('allowed.txt'))).toEqual([]);
  });

  it('reports each prohibited term with its original line and replacement', () => {
    expect(findViolations(fixture('prohibited.txt'))).toEqual([
      { line: 1, term: 'dividend', replacement: 'RevenueShare payout', text: 'const first = "Dividend";' },
      { line: 3, term: 'dividends', replacement: 'RevenueShare payouts', text: 'revenue sharing */ const second = "DIVIDENDS";' },
      { line: 4, term: 'revenue-share', replacement: 'RevenueShare', text: 'const third = "revenue-share and revenue sharing";' },
      { line: 4, term: 'revenue sharing', replacement: 'RevenueShare distributions', text: 'const third = "revenue-share and revenue sharing";' },
    ]);
  });

  it.each([
    ['const x = "dividend"; // revenue-share', 1],
    ['/* dividend */ const x = "dividends"; /* revenue sharing */', 1],
    ['const x = "https://example.com/revenue-share"; const y = "dividend";', 1],
    ['const x = "/* dividend */";', 1],
    ["const x = 'dividends // copy';", 1],
    ['const x = `revenue sharing`;', 1],
    ['const x = "escaped \\" dividend";', 1],
    ['/* dividend */', 0],
    ['/* dividend', 0],
    ['// dividends', 0],
    ['', 0],
    ['const dividendYield = "RevenueShare";', 0],
  ])('scans %j', (content, count) => {
    expect(findViolations(content)).toHaveLength(count);
  });

  it('preserves CRLF line numbers and has no state between calls', () => {
    const content = '// dividend\r\n/* dividends\r\n */\r\n"revenue sharing"';
    const expected = [{ line: 4, term: 'revenue sharing', replacement: 'RevenueShare distributions', text: '"revenue sharing"' }];
    expect(findViolations(content)).toEqual(expected);
    expect(findViolations('RevenueShare')).toEqual([]);
    expect(findViolations(content)).toEqual(expected);
  });

  it('imports without scanning, logging or exiting', () => {
    const result = spawnSync(process.execPath, ['-e', 'require(process.argv[1]); console.log("imported")', script], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('imported');
    expect(result.stderr).toBe('');
  });
});

describe('terminology CLI', () => {
  it('passes the current production source tree', () => {
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8', cwd: tmpdir() });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('All terminology is consistent');
  });

  it('recurses into TS/TSX, skips references/tests/non-source files and exits 1 on violations', () => {
    const root = mkdtempSync(join(tmpdir(), 'revora-terminology-'));
    try {
      mkdirSync(join(root, 'scripts'));
      mkdirSync(join(root, 'src', 'nested'), { recursive: true });
      mkdirSync(join(root, 'src', 'constants'));
      mkdirSync(join(root, 'src', '__tests__'));
      mkdirSync(join(root, 'src', 'test'));
      copyFileSync(script, join(root, 'scripts', 'validate-terminology.js'));
      for (const name of ['nested/allowed.ts', 'nested/allowed.tsx']) writeFileSync(join(root, 'src', name), fixture('allowed.txt'));
      for (const name of ['constants/terminology.ts', 'fixture.test.ts', 'fixture.spec.tsx', '__tests__/fixture.ts', 'test/setup.ts', 'notes.md']) {
        writeFileSync(join(root, 'src', name), 'dividends');
      }
      const run = () => spawnSync(process.execPath, [join(root, 'scripts', 'validate-terminology.js')], { encoding: 'utf8' });
      expect(run().status).toBe(0);
      writeFileSync(join(root, 'src', 'nested', 'bad.tsx'), fixture('prohibited.txt'));
      writeFileSync(join(root, 'src', 'nested', 'terminology.ts'), '"dividend"');
      const result = run();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('bad.tsx:3');
      expect(result.stderr).toContain('terminology.ts:1');
      expect(result.stderr).toContain('Replace with: "RevenueShare payouts"');
      expect(result.stderr).toContain('Terminology validation FAILED');
      expect(result.stderr.match(/VIOLATION:/g)).toHaveLength(5);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
