import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

// The public entry point under test (the barrel), plus the implementation
// module it is expected to re-export from, imported side by side.
import * as barrel from './index';
import * as direct from './RecentNetworksProvider';
import type { RecentNetworksContextValue } from './index';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  localStorageMock.clear();
});

// Consumes the context exclusively through the barrel path.
function BarrelConsumer() {
  const ctx = React.useContext(barrel.RecentNetworksContext);
  if (ctx === null) {
    return React.createElement('span', { 'data-testid': 'ctx' }, 'null');
  }
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'recents' }, ctx.recentNetworkIds.join(',')),
    React.createElement(
      'button',
      { onClick: () => ctx.addRecentNetwork('polygon') },
      'add-polygon',
    ),
  );
}

describe('RecentNetworksProvider barrel (index.ts)', () => {
  it('re-exports the provider and context as the exact same references', () => {
    expect(barrel.RecentNetworksProvider).toBe(direct.RecentNetworksProvider);
    expect(barrel.RecentNetworksContext).toBe(direct.RecentNetworksContext);
  });

  it('exposes a stable runtime surface and keeps the type-only export erased', () => {
    expect(typeof barrel.RecentNetworksProvider).toBe('function');
    expect(barrel.RecentNetworksContext).toBeDefined();
    // `RecentNetworksContextValue` is exported with `export type`, so it must
    // not exist as a runtime value on the barrel.
    expect('RecentNetworksContextValue' in barrel).toBe(false);
  });

  it('exposes RecentNetworksContextValue as a type compatible with the module', () => {
    const value: RecentNetworksContextValue = {
      recentNetworkIds: [],
      addRecentNetwork: () => {},
    };
    // Assignability must hold in both directions between the barrel type and
    // the implementation module's type.
    const viaDirect: direct.RecentNetworksContextValue = value;
    const viaBarrel: RecentNetworksContextValue = viaDirect;
    expect(viaBarrel.recentNetworkIds).toEqual([]);
    expect(typeof viaBarrel.addRecentNetwork).toBe('function');
  });

  it('delivers context from the barrel provider to a barrel consumer', () => {
    render(
      React.createElement(
        barrel.RecentNetworksProvider,
        { userId: 'barrel-user' },
        React.createElement(BarrelConsumer),
      ),
    );

    expect(document.querySelector('[data-testid="recents"]')!.textContent).toBe('');
    fireEvent.click(document.querySelector('button')!);
    expect(document.querySelector('[data-testid="recents"]')!.textContent).toBe('polygon');
    expect(JSON.parse(store['revora-recent-networks:barrel-user'])).toEqual(['polygon']);
  });

  it('returns the documented null context outside the barrel provider', () => {
    render(React.createElement(BarrelConsumer));
    expect(document.querySelector('[data-testid="ctx"]')!.textContent).toBe('null');
  });
});
