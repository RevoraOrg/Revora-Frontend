import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { TwoFactorRecoveryPage } from './TwoFactorRecoveryPage';

describe('TwoFactorRecoveryPage', () => {
  it('renders the recovery layout and back to sign in link', () => {
    render(
      <MemoryRouter>
        <TwoFactorRecoveryPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /two-factor recovery/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to sign in page/i }),
    ).toHaveAttribute('href', '/login');
  });
});
