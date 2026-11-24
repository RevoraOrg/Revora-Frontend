import { describe, it, expect } from 'vitest';
import { ThemeProvider, ThemeContext } from '.';
import type { ThemeMode, ResolvedTheme, ThemeContextValue } from '.';

describe('ThemeProvider index exports', () => {
  it('exports ThemeProvider', () => {
    expect(typeof ThemeProvider).toBe('function');
  });

  it('exports ThemeContext', () => {
    expect(ThemeContext).toBeDefined();
  });

  it('type exports are present at compile time', () => {
    // These are type-only checks; if compilation succeeds the test passes.
    const _mode: ThemeMode = 'system';
    const _resolved: ResolvedTheme = 'dark';
    const _ctx: ThemeContextValue = {
      theme: _mode,
      resolvedTheme: _resolved,
      setTheme: () => {},
      cycleTheme: () => {},
    };
    expect(_ctx.theme).toBe('system');
  });
});
