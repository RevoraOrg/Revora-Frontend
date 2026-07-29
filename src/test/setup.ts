import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

// jsdom does not implement ResizeObserver — provide a minimal stub
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement scrollIntoView — provide a minimal stub
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
