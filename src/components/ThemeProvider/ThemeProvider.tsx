/**
 * ThemeProvider — Theme management for Revora
 *
 * Supports three modes: 'system', 'light', 'dark'.
 * - 'system' follows the OS prefers-color-scheme media query.
 * - 'light' and 'dark' override the OS preference.
 *
 * The resolved theme is applied as a data-theme attribute on <html>
 * so CSS custom properties in :root[data-theme="light"] override the
 * dark-mode defaults already in src/index.css.
 *
 * Preference persists to localStorage under 'revora-theme'.
 * No FOUC: a small inline script in index.html reads localStorage and
 * sets the attribute synchronously before first paint.
 */

import React, { createContext, useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'revora-theme';
const MODES: ThemeMode[] = ['system', 'light', 'dark'];
const DEFAULT: ThemeMode = 'system';

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'system' || v === 'light' || v === 'dark') return v;
  } catch {
    // SSR / blocked storage — fall through
  }
  return DEFAULT;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemTheme();
  return mode;
}

export interface ThemeContextValue {
  /** The user's chosen mode: 'system' | 'light' | 'dark' */
  theme: ThemeMode;
  /** The effective rendered theme after resolving 'system' */
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
  /** Cycles: system → light → dark → system */
  cycleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readStored);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(readStored())
  );

  const applyTheme = useCallback((mode: ThemeMode) => {
    const resolved = resolveTheme(mode);
    setResolvedTheme(resolved);
    if (resolved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // storage unavailable — proceed without persistence
      }
      applyTheme(mode);
    },
    [applyTheme]
  );

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = MODES[(MODES.indexOf(prev) + 1) % MODES.length];
      setTheme(next);
      return next;
    });
  }, [setTheme]);

  // Apply on mount — intentional single-run effect
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line

  // Follow OS changes when mode is 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (theme === 'system') {
        applyTheme('system');
        setResolvedTheme(getSystemTheme());
      }
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari < 14 fallback
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
