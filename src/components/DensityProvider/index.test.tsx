/**
 * index.test.tsx — Issue #702
 *
 * Focused behavior coverage for `src/components/DensityProvider/index.ts`,
 * the public barrel entry of the DensityProvider module.
 *
 * All imports come from the barrel itself so the suite exercises exactly the
 * public contract consumers rely on (`main.tsx`, `AppShell.test.tsx`):
 *   - DensityProvider   (component)
 *   - DensityContext    (context object, null outside a provider)
 *   - DensityMode       (type: 'comfortable' | 'cozy' | 'compact')
 *   - DensityContextValue (type: { density, setDensity, cycle })
 *
 * Covered behavior:
 *   - success paths: default state, setDensity persistence + html attribute,
 *     cycle transitions, type exports
 *   - failure / boundary paths: invalid stored value rejected, storage write
 *     throwing is tolerated, runtime misuse passes through deterministically,
 *     context defaults to null outside a provider
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Everything under test is imported from the barrel — not the implementation file.
import {
  DensityProvider,
  DensityContext,
} from './index';
import type { DensityMode, DensityContextValue } from './index';

// ─── localStorage mock ───────────────────────────────────────────────────────
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
  localStorageMock.clear();
  document.documentElement.removeAttribute('data-density');
});

afterEach(() => {
  document.documentElement.removeAttribute('data-density');
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Consumer() {
  const ctx = React.useContext(DensityContext)!;
  return (
    <div>
      <span data-testid="mode">{ctx.density}</span>
      <button onClick={() => ctx.setDensity('compact')}>set-compact</button>
      <button onClick={() => ctx.setDensity('comfortable')}>set-comfortable</button>
      {/* Runtime misuse: the public API is typed, but callers can bypass types. */}
      <button onClick={() => ctx.setDensity('bogus' as unknown as DensityMode)}>
        set-bogus
      </button>
      <button onClick={ctx.cycle}>cycle</button>
    </div>
  );
}

const renderThroughBarrel = () =>
  render(
    <DensityProvider>
      <Consumer />
    </DensityProvider>
  );

// ─── Public contract: named exports ──────────────────────────────────────────
describe('DensityProvider index (barrel) — public contract', () => {
  it('exports DensityProvider as a renderable component', () => {
    expect(typeof DensityProvider).toBe('function');
    renderThroughBarrel();
    expect(screen.getByTestId('mode')).toBeInTheDocument();
  });

  it('exports DensityContext usable through the barrel import', () => {
    let captured: DensityContextValue | null = null;
    function Capture() {
      captured = React.useContext(DensityContext);
      return null;
    }
    render(
      <DensityProvider>
        <Capture />
      </DensityProvider>
    );
    expect(captured).not.toBeNull();
    expect(captured!.density).toBe('comfortable');
    expect(typeof captured!.setDensity).toBe('function');
    expect(typeof captured!.cycle).toBe('function');
  });

  it('exposes the DensityMode and DensityContextValue type exports', () => {
    // Compile-time contract: these only typecheck if the barrel re-exports both types.
    const mode: DensityMode = 'cozy';
    const value: DensityContextValue = {
      density: mode,
      setDensity: () => {},
      cycle: () => {},
    };
    expect(value.density).toBe('cozy');
  });

  it('DensityContext defaults to null outside a provider', () => {
    let captured: DensityContextValue | null | undefined;
    function Orphan() {
      captured = React.useContext(DensityContext);
      return null;
    }
    render(<Orphan />);
    expect(captured).toBeNull();
  });
});

// ─── Behavior: primary state transitions (success paths) ─────────────────────
describe('DensityProvider index (barrel) — state transitions', () => {
  it('defaults to comfortable with no data-density attribute on <html>', () => {
    renderThroughBarrel();
    expect(screen.getByTestId('mode').textContent).toBe('comfortable');
    expect(document.documentElement.hasAttribute('data-density')).toBe(false);
  });

  it('setDensity("compact") updates state, persists, and sets html attribute', () => {
    renderThroughBarrel();
    fireEvent.click(screen.getByText('set-compact'));
    expect(screen.getByTestId('mode').textContent).toBe('compact');
    expect(localStorageMock.getItem('revora-density')).toBe('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('transitioning back to comfortable removes the html attribute', () => {
    renderThroughBarrel();
    fireEvent.click(screen.getByText('set-compact'));
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    fireEvent.click(screen.getByText('set-comfortable'));
    expect(screen.getByTestId('mode').textContent).toBe('comfortable');
    expect(document.documentElement.hasAttribute('data-density')).toBe(false);
  });

  it('cycle advances comfortable → cozy → compact → comfortable and persists each step', () => {
    renderThroughBarrel();
    const mode = screen.getByTestId('mode');

    fireEvent.click(screen.getByText('cycle'));
    expect(mode.textContent).toBe('cozy');
    expect(localStorageMock.getItem('revora-density')).toBe('cozy');

    fireEvent.click(screen.getByText('cycle'));
    expect(mode.textContent).toBe('compact');
    expect(localStorageMock.getItem('revora-density')).toBe('compact');

    fireEvent.click(screen.getByText('cycle'));
    expect(mode.textContent).toBe('comfortable');
    expect(localStorageMock.getItem('revora-density')).toBe('comfortable');
  });
});

// ─── Behavior: invalid inputs & boundary conditions (failure paths) ──────────
describe('DensityProvider index (barrel) — invalid inputs and boundaries', () => {
  it('rejects an invalid stored value and falls back to comfortable', () => {
    localStorageMock.setItem('revora-density', 'invalid-value');
    renderThroughBarrel();
    expect(screen.getByTestId('mode').textContent).toBe('comfortable');
    expect(document.documentElement.hasAttribute('data-density')).toBe(false);
  });

  it('tolerates a throwing localStorage on setDensity and still applies state + attribute', () => {
    const throwingStorage = {
      ...localStorageMock,
      setItem: () => {
        throw new Error('storage unavailable');
      },
    };
    Object.defineProperty(window, 'localStorage', {
      value: throwingStorage,
      writable: true,
    });

    renderThroughBarrel();
    expect(() => fireEvent.click(screen.getByText('set-compact'))).not.toThrow();
    expect(screen.getByTestId('mode').textContent).toBe('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('passes runtime-misused values through deterministically (documented current behavior)', () => {
    renderThroughBarrel();
    // The public setDensity is typed, but a caller bypassing types gets
    // deterministic pass-through: state, persistence, and html attribute
    // all reflect the raw value until changed again.
    fireEvent.click(screen.getByText('set-bogus'));
    expect(screen.getByTestId('mode').textContent).toBe('bogus');
    expect(localStorageMock.getItem('revora-density')).toBe('bogus');
    expect(document.documentElement.getAttribute('data-density')).toBe('bogus');
  });

  it('recovers cleanly after a misused value by cycling to the next valid mode', () => {
    renderThroughBarrel();
    fireEvent.click(screen.getByText('set-bogus'));
    expect(screen.getByTestId('mode').textContent).toBe('bogus');

    // MODES.indexOf(bogus) is -1 → (-1 + 1) % 3 = 0 → 'comfortable'.
    fireEvent.click(screen.getByText('cycle'));
    expect(screen.getByTestId('mode').textContent).toBe('comfortable');
    expect(localStorageMock.getItem('revora-density')).toBe('comfortable');
  });
});
