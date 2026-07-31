// Browser API stubs — runs before the vitest framework is injected.
// Do NOT import anything from 'vitest' here.
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

// ResizeObserver stub — jsdom does not implement it.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// matchMedia stub — jsdom does not implement it. Components that detect print
// mode (usePrintMode) and some chart widgets call window.matchMedia() on mount.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom does not implement scrollIntoView — provide a minimal stub
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
