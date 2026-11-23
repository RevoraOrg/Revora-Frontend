/**
 * useTheme — consume ThemeContext.
 *
 * Must be called inside a ThemeProvider tree.
 */

import { useContext } from 'react';
import { ThemeContext } from '../components/ThemeProvider/ThemeProvider';
import type { ThemeContextValue } from '../components/ThemeProvider/ThemeProvider';

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return ctx;
}
