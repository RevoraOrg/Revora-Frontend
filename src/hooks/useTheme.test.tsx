import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTheme } from './useTheme';
import { ThemeProvider } from '../components/ThemeProvider';

describe('useTheme', () => {
  it('returns context value inside ThemeProvider', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });
    expect(result.current.theme).toBe('system');
    expect(['light', 'dark']).toContain(result.current.resolvedTheme);
    expect(typeof result.current.setTheme).toBe('function');
    expect(typeof result.current.cycleTheme).toBe('function');
  });

  it('throws when used outside ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used inside a ThemeProvider'
    );
  });
});
