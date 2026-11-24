import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';
import type { ThemeContextValue } from '../ThemeProvider/ThemeProvider';

function makeCtx(overrides: Partial<ThemeContextValue> = {}): ThemeContextValue {
  return {
    theme: 'system',
    resolvedTheme: 'dark',
    setTheme: vi.fn(),
    cycleTheme: vi.fn(),
    ...overrides,
  };
}

function wrap(ctx: ThemeContextValue, props: { compact?: boolean } = {}) {
  return render(
    <ThemeContext.Provider value={ctx}>
      <ThemeToggle {...props} />
    </ThemeContext.Provider>
  );
}

describe('ThemeToggle', () => {
  it('renders three radio buttons', () => {
    wrap(makeCtx());
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('marks the active option as checked', () => {
    wrap(makeCtx({ theme: 'dark' }));
    expect(screen.getByRole('radio', { name: /dark theme/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /light theme/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls setTheme with correct value on click', () => {
    const ctx = makeCtx();
    wrap(ctx);
    fireEvent.click(screen.getByRole('radio', { name: /light theme/i }));
    expect(ctx.setTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme when navigating right with ArrowRight', () => {
    const ctx = makeCtx({ theme: 'system' });
    wrap(ctx);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(ctx.setTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme when navigating left with ArrowLeft', () => {
    const ctx = makeCtx({ theme: 'system' });
    wrap(ctx);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(ctx.setTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme when navigating down with ArrowDown', () => {
    const ctx = makeCtx({ theme: 'light' });
    wrap(ctx);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(ctx.setTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme when navigating up with ArrowUp', () => {
    const ctx = makeCtx({ theme: 'light' });
    wrap(ctx);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowUp' });
    expect(ctx.setTheme).toHaveBeenCalledWith('system');
  });

  it('wraps around from dark to system with ArrowRight', () => {
    const ctx = makeCtx({ theme: 'dark' });
    wrap(ctx);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(ctx.setTheme).toHaveBeenCalledWith('system');
  });

  it('renders labels when compact is false', () => {
    wrap(makeCtx(), { compact: false });
    expect(screen.getByText('System')).toBeDefined();
    expect(screen.getByText('Light')).toBeDefined();
    expect(screen.getByText('Dark')).toBeDefined();
  });

  it('hides labels when compact is true', () => {
    wrap(makeCtx(), { compact: true });
    expect(screen.queryByText('System')).toBeNull();
    expect(screen.queryByText('Light')).toBeNull();
    expect(screen.queryByText('Dark')).toBeNull();
  });

  it('renders an accessible radiogroup with label', () => {
    wrap(makeCtx());
    expect(screen.getByRole('radiogroup', { name: /color theme/i })).toBeDefined();
  });

  it('active button has tabIndex 0, inactive buttons have tabIndex -1', () => {
    wrap(makeCtx({ theme: 'light' }));
    expect(screen.getByRole('radio', { name: /light theme/i })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: /dark theme/i })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: /follow system theme/i })).toHaveAttribute('tabindex', '-1');
  });
});
