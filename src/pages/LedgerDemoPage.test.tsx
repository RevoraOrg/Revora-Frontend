import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { LedgerDemoPage } from './LedgerDemoPage';

describe('LedgerDemoPage', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/investor/ledger');
    document.body.style.overflow = '';
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/investor/ledger');
    document.body.style.overflow = '';
  });

  it('renders the page heading and virtualized ledger rows', () => {
    render(<LedgerDemoPage />);

    expect(screen.getByRole('heading', { name: 'Ledger Entries' })).toBeInTheDocument();
    const grid = screen.getByRole('grid', { name: 'Ledger entries table' });
    expect(grid).toBeInTheDocument();

    expect(within(grid).getByText('ENT-0001')).toBeInTheDocument();
    expect(within(grid).getByText('ENT-0002')).toBeInTheDocument();
  });

  it('opens the detail drawer and updates the URL permalink param when a row is clicked', async () => {
    const user = userEvent.setup();
    render(<LedgerDemoPage />);

    await user.click(screen.getByText('ENT-0001'));

    const drawer = screen.getByRole('dialog');
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByText('Entry ENT-0001')).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('entry')).toBe('ENT-0001');

    await user.click(screen.getByLabelText('Close row detail'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('entry')).toBeNull();
  });

  it('opens the drawer on initial render when the URL already contains the entry permalink param', () => {
    window.history.replaceState(null, '', '/investor/ledger?entry=ENT-0002');
    render(<LedgerDemoPage />);

    const drawer = screen.getByRole('dialog');
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByText('Entry ENT-0002')).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('entry')).toBe('ENT-0002');
  });
});
