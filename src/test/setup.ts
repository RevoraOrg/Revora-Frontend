// Test setup — runs in the jsdom environment before each test file.
// Uses globalThis.expect injected by vitest (globals: true) to extend matchers.
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { toHaveNoViolations } from 'jest-axe';

// globalThis.expect is injected by vitest when globals: true is set.
// We cannot import { expect } from 'vitest' here because setupFiles runs
// before the vitest runner is fully initialised in vitest 4.x.
(globalThis as any).expect?.extend(jestDomMatchers);
(globalThis as any).expect?.extend(toHaveNoViolations);

// ResizeObserver stub — jsdom does not implement it.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement scrollIntoView — provide a minimal stub
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
