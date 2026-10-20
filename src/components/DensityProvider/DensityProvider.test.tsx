import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DensityProvider, DensityContext } from './DensityProvider';
import type { DensityContextValue, DensityMode } from './DensityProvider';

// ─── localStorage mock ───────────────────────────────────────────────────────
const store: Record<string, string> = {};
const localStorageMock = {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear:      () => { Object.keys(store).forEach((k) => delete store[k]); },
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  localStorageMock.clear();
  document.documentElement.removeAttribute('data-density');
});

afterEach(() => {
  document.documentElement.removeAttribute('data-density');
});

// ─── Helper consumer ─────────────────────────────────────────────────────────
function Consumer() {
  const ctx = React.useContext(DensityContext)!;
  return (
    <div>
      <span data-testid="mode">{ctx.density}</span>
      <button onClick={() => ctx.setDensity('compact')}>set-compact</button>
      <button onClick={() => ctx.setDensity('cozy')}>set-cozy</button>
      <button onClick={() => ctx.setDensity('comfortable')}>set-comfortable</button>
      <button onClick={ctx.cycle}>cycle</button>
    </div>
  );
}

// ─── DensityProvider tests ───────────────────────────────────────────────────
describe('DensityProvider', () => {
  it('defaults to comfortable', () => {
    render(<DensityProvider><Consumer /></DensityProvider>);
    expect(screen.getByTestId('mode').textContent).toBe('comfortable');
  });

  it('reads stored preference from localStorage', () => {
    localStorageMock.setItem('revora-density', 'compact');
    render(<DensityProvider><Consumer /></DensityProvider>);
    expect(screen.getByTestId('mode').textContent).toBe('compact');
  });

  it('ignores invalid localStorage value', () => {
    localStorageMock.setItem('revora-density', 'invalid-value');
    render(<DensityProvider><Consumer /></DensityProvider>);
    expect(screen.getByTestId('mode').textContent).toBe('comfortable');
  });

  it('persists to localStorage on setDensity', () => {
    render(<DensityProvider><Consumer /></DensityProvider>);
    fireEvent.click(screen.getByText('set-compact'));
    expect(localStorageMock.getItem('revora-density')).toBe('compact');
  });

  it('sets data-density attribute on <html> for non-default modes', () => {
    render(<DensityProvider><Consumer /></DensityProvider>);
    fireEvent.click(screen.getByText('set-cozy'));
    expect(document.documentElement.getAttribute('data-density')).toBe('cozy');
  });

  it('removes data-density attribute for comfortable (default)', () => {
    localStorageMock.setItem('revora-density', 'compact');
    render(<DensityProvider><Consumer /></DensityProvider>);
    fireEvent.click(screen.getByText('set-comfortable'));
    expect(document.documentElement.hasAttribute('data-density')).toBe(false);
  });

  it('cycle advances through comfortable → cozy → compact → comfortable', () => {
    render(<DensityProvider><Consumer /></DensityProvider>);
    const cycleBtn = screen.getByText('cycle');
    const mode = screen.getByTestId('mode');

    expect(mode.textContent).toBe('comfortable');
    fireEvent.click(cycleBtn);
    expect(mode.textContent).toBe('cozy');
    fireEvent.click(cycleBtn);
    expect(mode.textContent).toBe('compact');
    fireEvent.click(cycleBtn);
    expect(mode.textContent).toBe('comfortable');
  });

  it('syncs html attribute on mount when stored value is cozy', () => {
    localStorageMock.setItem('revora-density', 'cozy');
    render(<DensityProvider><Consumer /></DensityProvider>);
    expect(document.documentElement.getAttribute('data-density')).toBe('cozy');
  });

  it('provides context value — density, setDensity, cycle', () => {
    let captured: DensityContextValue | null = null;
    function Capture() {
      captured = React.useContext(DensityContext);
      return null;
    }
    render(<DensityProvider><Capture /></DensityProvider>);
    expect(captured).not.toBeNull();
    expect(typeof (captured as DensityContextValue).setDensity).toBe('function');
    expect(typeof (captured as DensityContextValue).cycle).toBe('function');
  });
});
