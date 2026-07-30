import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DensityProvider } from '../DensityProvider/DensityProvider';
import { DensityToggle } from './DensityToggle';

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

function Wrapper({ children }: { children: React.ReactNode }) {
  return <DensityProvider>{children}</DensityProvider>;
}

describe('DensityToggle', () => {
  it('renders a radiogroup with three options', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    expect(screen.getByRole('radiogroup', { name: 'View density' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('marks comfortable as checked by default', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    expect(screen.getByRole('radio', { name: /comfortable/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /cozy/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /compact/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking a button changes density', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('radio', { name: /compact/i }));
    expect(screen.getByRole('radio', { name: /compact/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /comfortable/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('ArrowRight advances to next option', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: /cozy/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowLeft wraps around to compact from comfortable', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(screen.getByRole('radio', { name: /compact/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowDown behaves same as ArrowRight', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(screen.getByRole('radio', { name: /cozy/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowUp behaves same as ArrowLeft', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowUp' });
    expect(screen.getByRole('radio', { name: /compact/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('compact prop hides text labels', () => {
    render(<DensityToggle compact />, { wrapper: Wrapper });
    expect(screen.queryByText('Comfortable')).not.toBeInTheDocument();
    expect(screen.queryByText('Cozy')).not.toBeInTheDocument();
    expect(screen.queryByText('Compact')).not.toBeInTheDocument();
  });

  it('non-compact shows text labels', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    expect(screen.getByText('Comfortable')).toBeInTheDocument();
    expect(screen.getByText('Cozy')).toBeInTheDocument();
    expect(screen.getByText('Compact')).toBeInTheDocument();
  });

  it('active button has tabIndex=0, others have tabIndex=-1', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    const comfortable = screen.getByRole('radio', { name: /comfortable/i });
    const cozy = screen.getByRole('radio', { name: /cozy/i });
    expect(comfortable).toHaveAttribute('tabindex', '0');
    expect(cozy).toHaveAttribute('tabindex', '-1');
  });

  it('persists selection to localStorage on click', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('radio', { name: /cozy/i }));
    expect(localStorageMock.getItem('revora-density')).toBe('cozy');
  });

  it('all buttons have accessible aria-label titles', () => {
    render(<DensityToggle />, { wrapper: Wrapper });
    expect(screen.getByRole('radio', { name: /Comfortable density/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Cozy density/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Compact density/i })).toBeInTheDocument();
  });
});
