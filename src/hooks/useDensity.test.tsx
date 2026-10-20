import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DensityProvider } from '../components/DensityProvider/DensityProvider';
import { useDensity } from './useDensity';

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

function HookConsumer() {
  const { density, setDensity, cycle } = useDensity();
  return (
    <div>
      <span data-testid="mode">{density}</span>
      <button onClick={() => setDensity('compact')}>compact</button>
      <button onClick={cycle}>cycle</button>
    </div>
  );
}

describe('useDensity', () => {
  it('returns current density from provider', () => {
    render(
      <DensityProvider>
        <HookConsumer />
      </DensityProvider>,
    );
    expect(screen.getByTestId('mode').textContent).toBe('comfortable');
  });

  it('restores a valid stored density', () => {
    localStorageMock.setItem('revora-density', 'compact');
    render(
      <DensityProvider>
        <HookConsumer />
      </DensityProvider>,
    );
    expect(screen.getByTestId('mode').textContent).toBe('compact');
  });

  it('falls back to comfortable for an invalid stored density', () => {
    localStorageMock.setItem('revora-density', 'spacious');
    render(
      <DensityProvider>
        <HookConsumer />
      </DensityProvider>,
    );
    expect(screen.getByTestId('mode').textContent).toBe('comfortable');
  });

  it('setDensity updates the value', () => {
    render(
      <DensityProvider>
        <HookConsumer />
      </DensityProvider>,
    );
    fireEvent.click(screen.getByText('compact'));
    expect(screen.getByTestId('mode').textContent).toBe('compact');
  });

  it('cycle advances to next mode', () => {
    render(
      <DensityProvider>
        <HookConsumer />
      </DensityProvider>,
    );
    fireEvent.click(screen.getByText('cycle'));
    expect(screen.getByTestId('mode').textContent).toBe('cozy');
  });

  it('cycle wraps from compact to comfortable', () => {
    localStorageMock.setItem('revora-density', 'compact');
    render(
      <DensityProvider>
        <HookConsumer />
      </DensityProvider>,
    );
    fireEvent.click(screen.getByText('cycle'));
    expect(screen.getByTestId('mode').textContent).toBe('comfortable');
  });

  it('throws when used outside DensityProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => render(<HookConsumer />)).toThrow(
        'useDensity must be used inside <DensityProvider>',
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
