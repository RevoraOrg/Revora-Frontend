import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

  it('throws when used outside DensityProvider', () => {
    const originalError = console.error;
    console.error = () => {};
    expect(() => render(<HookConsumer />)).toThrow(
      'useDensity must be used inside <DensityProvider>',
    );
    console.error = originalError;
  });
});
