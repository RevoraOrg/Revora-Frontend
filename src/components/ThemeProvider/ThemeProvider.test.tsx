import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeProvider, ThemeContext } from './ThemeProvider';
import type { ThemeContextValue } from './ThemeProvider';

// ─── localStorage mock ───────────────────────────────────────────────────────
const store: Record<string, string> = {};
const localStorageMock = {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear:      () => { Object.keys(store).forEach((k) => delete store[k]); },
};

// ─── matchMedia mock ─────────────────────────────────────────────────────────
let systemPrefersDark = true;
let mqlChangeListener: ((e: { matches: boolean }) => void) | null = null;

function makeMql(matches: boolean) {
  return {
    matches,
    addEventListener: vi.fn((_: string, cb: (e: { matches: boolean }) => void) => {
      mqlChangeListener = cb;
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  localStorageMock.clear();
  document.documentElement.removeAttribute('data-theme');
  mqlChangeListener = null;
  systemPrefersDark = true;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      if (query === '(prefers-color-scheme: light)') {
        return makeMql(!systemPrefersDark);
      }
      return makeMql(false);
    },
  });
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

// ─── Helper consumer ─────────────────────────────────────────────────────────
function Consumer() {
  const ctx = React.useContext(ThemeContext)!;
  return (
    <div>
      <span data-testid="theme">{ctx.theme}</span>
      <span data-testid="resolved">{ctx.resolvedTheme}</span>
      <button onClick={() => ctx.setTheme('light')}>set-light</button>
      <button onClick={() => ctx.setTheme('dark')}>set-dark</button>
      <button onClick={() => ctx.setTheme('system')}>set-system</button>
      <button onClick={ctx.cycleTheme}>cycle</button>
    </div>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('ThemeProvider', () => {
  it('defaults to system mode', () => {
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('resolves system to dark when OS prefers dark', () => {
    systemPrefersDark = true;
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('resolves system to light when OS prefers light', () => {
    systemPrefersDark = false;
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('reads stored preference "light" from localStorage', () => {
    localStorageMock.setItem('revora-theme', 'light');
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });

  it('reads stored preference "dark" from localStorage', () => {
    localStorageMock.setItem('revora-theme', 'dark');
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });

  it('ignores invalid localStorage value', () => {
    localStorageMock.setItem('revora-theme', 'invalid');
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('persists to localStorage on setTheme', () => {
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.click(screen.getByText('set-light'));
    expect(localStorageMock.getItem('revora-theme')).toBe('light');
  });

  it('sets data-theme="light" on <html> when theme is light', () => {
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.click(screen.getByText('set-light'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('removes data-theme when theme is dark', () => {
    localStorageMock.setItem('revora-theme', 'light');
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.click(screen.getByText('set-dark'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('removes data-theme when theme is system + OS dark', () => {
    systemPrefersDark = true;
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.click(screen.getByText('set-light'));
    fireEvent.click(screen.getByText('set-system'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('cycleTheme advances: system → light → dark → system', () => {
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    const cycleBtn = screen.getByText('cycle');
    const themeEl = screen.getByTestId('theme');

    expect(themeEl.textContent).toBe('system');
    fireEvent.click(cycleBtn);
    expect(themeEl.textContent).toBe('light');
    fireEvent.click(cycleBtn);
    expect(themeEl.textContent).toBe('dark');
    fireEvent.click(cycleBtn);
    expect(themeEl.textContent).toBe('system');
  });

  it('provides context value with theme, resolvedTheme, setTheme, cycleTheme', () => {
    let captured: ThemeContextValue | null = null;
    function Capture() {
      captured = React.useContext(ThemeContext);
      return null;
    }
    render(<ThemeProvider><Capture /></ThemeProvider>);
    expect(captured).not.toBeNull();
    expect(typeof (captured as ThemeContextValue).setTheme).toBe('function');
    expect(typeof (captured as ThemeContextValue).cycleTheme).toBe('function');
    expect((captured as ThemeContextValue).theme).toBe('system');
    expect(['light', 'dark']).toContain((captured as ThemeContextValue).resolvedTheme);
  });
});
