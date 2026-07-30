import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Ledger } from './Ledger';
import '@testing-library/jest-dom';

/**
 * Helper: gets the FIRST expand/collapse button matching a name regex.
 * Uses querySelector for reliability since the desktop table uses `hidden`
 * (display:none) which ByRole queries may exclude.
 */
function getExpandButton(entryId: string, count: number): HTMLElement {
  const suffix = count !== 1 ? 's' : '';
  const label = `Expand ${count} sub-event${suffix} for ${entryId}`;
  const btn = document.querySelector(`button[aria-label="${label}"]`);
  if (!btn) throw new Error(`Button not found: ${label}`);
  return btn as HTMLElement;
}

function getCollapseButton(entryId: string): HTMLElement {
  const label = `Collapse sub-events for ${entryId}`;
  const btn = document.querySelector(`button[aria-label="${label}"]`);
  if (!btn) throw new Error(`Button not found: ${label}`);
  return btn as HTMLElement;
}

function getDisabledButton(entryId: string): HTMLElement {
  const label = `No related events for ${entryId}`;
  const btn = document.querySelector(`button[aria-label="${label}"]`);
  if (!btn) throw new Error(`Button not found: ${label}`);
  return btn as HTMLElement;
}

describe('Ledger Component', () => {
  let originalClipboard: any;

  beforeAll(() => {
    originalClipboard = global.navigator.clipboard;
    Object.defineProperty(global.navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(global.navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  it('renders the ledger title and description', () => {
    render(<Ledger />);
    expect(screen.getByText('Ledger')).toBeInTheDocument();
    expect(screen.getByText(/Detailed transaction history/)).toBeInTheDocument();
  });

  it('renders the table with headers', () => {
    render(<Ledger />);
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
  });

  it('expands and collapses a row with sub-events', () => {
    render(<Ledger />);
    
    // Find the first expand button in the new LedgerTable
    const expandButtons = screen.getAllByRole('button', { name: 'Open detail' });
    expect(expandButtons.length).toBeGreaterThan(0);
    
    // Initially sub-events table should not be visible
    expect(screen.queryByRole('columnheader', { name: 'Sub-event Date' })).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(expandButtons[0]);
    
    // Now sub-events table should be visible
    expect(screen.getByRole('columnheader', { name: 'Sub-event Date' })).toBeInTheDocument();
    
    // Click to collapse
    const collapseButton = screen.getByRole('button', { name: 'Close detail' });
    fireEvent.click(collapseButton);
    
    // Sub-events table should be hidden again
    expect(screen.queryByRole('columnheader', { name: 'Sub-event Date' })).not.toBeInTheDocument();
  });

  it('handles pagination', () => {
    render(<Ledger />);
    
    expect(screen.getByText(/Page 1 of 5/)).toBeInTheDocument();
    
    const nextButton = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(nextButton);
    
    expect(screen.getByText(/Page 2 of 5/)).toBeInTheDocument();
    
    const prevButton = screen.getByRole('button', { name: 'Previous page' });
    fireEvent.click(prevButton);
    
    expect(screen.getByText(/Page 1 of 5/)).toBeInTheDocument();
  });

  describe('Keyboard row selection and range-copy (#243)', () => {
    it('Shift+ArrowDown extends selection', () => {
      render(<Ledger />);
      const rows = screen.getAllByRole('row');
      // Click the first data row to set anchor
      fireEvent.click(rows[1]);
      
      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true }); // extend to row 1
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('Ctrl+A selects all rows in view and shows count', () => {
      render(<Ledger />);
      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'a', ctrlKey: true });
      expect(screen.getByText('10 selected')).toBeInTheDocument(); // pageSize is 10
    });

    it('Ctrl+C triggers copy toast', async () => {
      render(<Ledger />);
      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'a', ctrlKey: true });
      fireEvent.keyDown(grid, { key: 'c', ctrlKey: true });
      
      const toast = await screen.findByTestId('copy-toast');
      expect(toast).toHaveTextContent(/Copied/);
    });
  });
});

