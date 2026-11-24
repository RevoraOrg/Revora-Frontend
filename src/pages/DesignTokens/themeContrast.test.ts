/**
 * themeContrast.test.ts
 *
 * Verifies that the light-theme surface/text token pairs defined in
 * src/index.css all meet WCAG 2.1 AA (≥ 4.5:1 for normal text, ≥ 3:1 for
 * graphical / large text) in both dark and light themes.
 *
 * Uses contrastRatio() from contrast.ts so the same algorithm the
 * DesignTokensPage UI uses is exercised in CI.
 */

import { describe, it, expect } from 'vitest';
import { contrastRatio, wcagGrade, DARK_SURFACE, LIGHT_SURFACE } from './contrast';

/** Pairs that must pass WCAG AA normal text (≥ 4.5:1) in dark mode */
const DARK_AA_TEXT_PAIRS: { name: string; fg: string; bg: string }[] = [
  { name: 'text-main on bg-color',      fg: '#e5e7eb', bg: DARK_SURFACE },
  { name: 'text-muted on bg-color',     fg: '#cbd5e1', bg: DARK_SURFACE },
  { name: 'primary on bg-color',        fg: '#3b82f6', bg: DARK_SURFACE },
  { name: 'chart-tooltip-fg on tooltip-bg', fg: '#f8fafc', bg: '#0f172a' },
];

/** Pairs that must pass WCAG AA normal text (≥ 4.5:1) in light mode */
const LIGHT_AA_TEXT_PAIRS: { name: string; fg: string; bg: string }[] = [
  { name: 'text-main on bg-color (light)',  fg: '#0f172a', bg: LIGHT_SURFACE },
  { name: 'text-muted on bg-color (light)', fg: '#475569', bg: LIGHT_SURFACE },
  { name: 'primary on bg-color (light)',    fg: '#2563eb', bg: LIGHT_SURFACE },
  { name: 'chart-tooltip-fg on tooltip-bg (light)', fg: '#0f172a', bg: '#f1f5f9' },
];

/** Pairs that need at least WCAG AA large-text / graphical (≥ 3:1) */
const DARK_AA_LARGE_PAIRS: { name: string; fg: string; bg: string }[] = [
  { name: 'chart-cat-1-dark on dark surface', fg: '#60a5fa', bg: DARK_SURFACE },
  { name: 'chart-cat-2-dark on dark surface', fg: '#34d399', bg: DARK_SURFACE },
  { name: 'chart-cat-3-dark on dark surface', fg: '#fbbf24', bg: DARK_SURFACE },
  { name: 'chart-cat-4-dark on dark surface', fg: '#a78bfa', bg: DARK_SURFACE },
  { name: 'chart-cat-5-dark on dark surface', fg: '#f87171', bg: DARK_SURFACE },
  { name: 'chart-cat-6-dark on dark surface', fg: '#22d3ee', bg: DARK_SURFACE },
  { name: 'chart-cat-7-dark on dark surface', fg: '#fb923c', bg: DARK_SURFACE },
  { name: 'chart-cat-8-dark on dark surface', fg: '#f472b6', bg: DARK_SURFACE },
];

const LIGHT_AA_LARGE_PAIRS: { name: string; fg: string; bg: string }[] = [
  { name: 'chart-cat-1-light on light surface', fg: '#2563eb', bg: LIGHT_SURFACE },
  { name: 'chart-cat-2-light on light surface', fg: '#059669', bg: LIGHT_SURFACE },
  { name: 'chart-cat-3-light on light surface', fg: '#d97706', bg: LIGHT_SURFACE },
  { name: 'chart-cat-4-light on light surface', fg: '#7c3aed', bg: LIGHT_SURFACE },
  { name: 'chart-cat-5-light on light surface', fg: '#dc2626', bg: LIGHT_SURFACE },
  { name: 'chart-cat-6-light on light surface', fg: '#0891b2', bg: LIGHT_SURFACE },
  { name: 'chart-cat-7-light on light surface', fg: '#ea580c', bg: LIGHT_SURFACE },
  { name: 'chart-cat-8-light on light surface', fg: '#be185d', bg: LIGHT_SURFACE },
];

describe('Theme contrast — dark mode text pairs meet WCAG AA (≥ 4.5:1)', () => {
  it.each(DARK_AA_TEXT_PAIRS)('$name', ({ fg, bg }) => {
    const ratio = contrastRatio(fg, bg);
    const grade = wcagGrade(ratio);
    expect(ratio, `Ratio is null for ${fg}/${bg}`).not.toBeNull();
    expect(ratio!, `${fg} on ${bg} = ${ratio}:1, need ≥ 4.5:1`).toBeGreaterThanOrEqual(4.5);
    expect(['AA', 'AAA']).toContain(grade);
  });
});

describe('Theme contrast — light mode text pairs meet WCAG AA (≥ 4.5:1)', () => {
  it.each(LIGHT_AA_TEXT_PAIRS)('$name', ({ fg, bg }) => {
    const ratio = contrastRatio(fg, bg);
    const grade = wcagGrade(ratio);
    expect(ratio, `Ratio is null for ${fg}/${bg}`).not.toBeNull();
    expect(ratio!, `${fg} on ${bg} = ${ratio}:1, need ≥ 4.5:1`).toBeGreaterThanOrEqual(4.5);
    expect(['AA', 'AAA']).toContain(grade);
  });
});

describe('Theme contrast — dark chart tokens meet WCAG AA large/graphical (≥ 3:1)', () => {
  it.each(DARK_AA_LARGE_PAIRS)('$name', ({ fg, bg }) => {
    const ratio = contrastRatio(fg, bg);
    expect(ratio, `Ratio is null for ${fg}/${bg}`).not.toBeNull();
    expect(ratio!, `${fg} on ${bg} = ${ratio}:1, need ≥ 3:1`).toBeGreaterThanOrEqual(3);
  });
});

describe('Theme contrast — light chart tokens meet WCAG AA large/graphical (≥ 3:1)', () => {
  it.each(LIGHT_AA_LARGE_PAIRS)('$name', ({ fg, bg }) => {
    const ratio = contrastRatio(fg, bg);
    expect(ratio, `Ratio is null for ${fg}/${bg}`).not.toBeNull();
    expect(ratio!, `${fg} on ${bg} = ${ratio}:1, need ≥ 3:1`).toBeGreaterThanOrEqual(3);
  });
});
