import { describe, it, expect } from 'vitest';
import { ThemeToggle } from '.';

describe('ThemeToggle index exports', () => {
  it('exports ThemeToggle', () => {
    expect(typeof ThemeToggle).toBe('function');
  });
});
