import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { axe } from 'jest-axe';
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
  // ────────────────────────────────────
  // 1. Basic rendering
  // ────────────────────────────────────
  describe('rendering', () => {
    it('renders the ledger title and description', () => {
      render(<Ledger />);
      expect(screen.getByText('Ledger')).toBeInTheDocument();
      expect(
        screen.getByText(/Detailed transaction history/),
      ).toBeInTheDocument();
    });

    it('renders the desktop table with all column headers', () => {
      render(<Ledger />);
      expect(
        screen.getByRole('columnheader', { name: 'Date' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Type' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Amount' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Asset' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Status' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Reference' }),
      ).toBeInTheDocument();
    });

    it('renders 10 rows per page', () => {
      render(<Ledger />);
      const table = screen.getByRole('grid', { name: 'Ledger entries table' });
      const tbody = table.querySelector('tbody');
      const rows = tbody?.querySelectorAll('tr') ?? [];
      expect(rows.length).toBeGreaterThanOrEqual(10);
    });

    it('renders the pagination info', () => {
      render(<Ledger />);
      expect(
        screen.getByText(/Showing 1 to 10 of 50 results/),
      ).toBeInTheDocument();
    });

    it('renders all page number buttons in desktop pagination', () => {
      render(<Ledger />);
      for (let i = 1; i <= 5; i++) {
        expect(
          screen.getByRole('button', { name: `Page ${i}` }),
        ).toBeInTheDocument();
      }
    });
  });

  // ────────────────────────────────────
  // 2. Expand / collapse — normal sub-events
  // ────────────────────────────────────
  describe('row expansion with sub-events', () => {
    it('expands a row to reveal sub-events table', () => {
      render(<Ledger />);
      const expandButton = getExpandButton('ENT-0001', 3);
      expect(expandButton).toBeInTheDocument();

      expect(
        screen.queryByRole('grid', { name: /Sub-events detail for ENT-0001/ }),
      ).not.toBeInTheDocument();

      fireEvent.click(expandButton);

      expect(
        screen.getByRole('grid', { name: /Sub-events detail for ENT-0001/ }),
      ).toBeInTheDocument();
    });

    it('displays sub-event data correctly when expanded', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0001', 3));

      expect(
        screen.getByRole('columnheader', { name: 'Sub-event Date' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Sub-event ID' }),
      ).toBeInTheDocument();

      const subTable = screen.getByRole('grid', {
        name: /Sub-events detail for ENT-0001/,
      });
      expect(within(subTable).getByText('Split')).toBeInTheDocument();
      expect(within(subTable).getByText('Retry')).toBeInTheDocument();
      expect(within(subTable).getByText('Adjustment')).toBeInTheDocument();
    });

    it('collapses an expanded row', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0001', 3));

      expect(
        screen.getByRole('grid', { name: /Sub-events detail for ENT-0001/ }),
      ).toBeInTheDocument();

      fireEvent.click(getCollapseButton('ENT-0001'));

      expect(
        screen.queryByRole('grid', { name: /Sub-events detail for ENT-0001/ }),
      ).not.toBeInTheDocument();
    });

    it('can expand multiple rows independently', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0001', 3));
      fireEvent.click(getExpandButton('ENT-0003', 8));

      expect(
        screen.getByRole('grid', { name: /Sub-events detail for ENT-0001/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('grid', { name: /Sub-events detail for ENT-0003/ }),
      ).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────
  // 3. Empty sub-events state
  // ────────────────────────────────────
  describe('empty sub-events state', () => {
    it('shows empty message when row has an empty subEvents array', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0004', 0));

      expect(
        screen.getAllByText('No related events for this entry.')[0],
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Sub-events like splits, retries, or adjustments/),
      ).toBeInTheDocument();
    });

    it('can collapse the empty sub-events message', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0004', 0));

      expect(
        screen.getAllByText('No related events for this entry.').length,
      ).toBeGreaterThanOrEqual(1);

      fireEvent.click(getCollapseButton('ENT-0004'));

      expect(
        screen.queryByText('No related events for this entry.'),
      ).not.toBeInTheDocument();
    });
  });

  // ────────────────────────────────────
  // 4. Rows with no subEvents at all
  // ────────────────────────────────────
  describe('rows without subEvents property', () => {
    it('renders a disabled chevron for rows without subEvents', () => {
      render(<Ledger />);
      const disabledButton = getDisabledButton('ENT-0005');
      expect(disabledButton).toBeDisabled();
      expect(disabledButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('disabled chevron cannot be clicked to expand', () => {
      render(<Ledger />);
      const disabledButton = getDisabledButton('ENT-0005');
      fireEvent.click(disabledButton);

      expect(
        screen.queryByRole('grid', { name: /Sub-events detail for ENT-0005/ }),
      ).not.toBeInTheDocument();
    });
  });

  // ────────────────────────────────────
  // 5. Chevron animation / styling
  // ────────────────────────────────────
  describe('chevron transitions', () => {
    it('chevron has rotate-0 when collapsed and rotate-90 when expanded', () => {
      render(<Ledger />);
      const expandButton = getExpandButton('ENT-0001', 3);
      const chevronIcon = expandButton.querySelector('.lucide-chevron-right');
      expect(chevronIcon).toBeInTheDocument();
      expect(chevronIcon).toHaveClass('rotate-0');

      fireEvent.click(expandButton);
      const collapseButton = getCollapseButton('ENT-0001');
      const expandedChevron =
        collapseButton.querySelector('.lucide-chevron-right');
      expect(expandedChevron).toHaveClass('rotate-90');
    });

    it('chevron has transition classes', () => {
      render(<Ledger />);
      const expandButton = getExpandButton('ENT-0001', 3);
      const chevronIcon = expandButton.querySelector('.lucide-chevron-right');
      expect(chevronIcon).toHaveClass('transition-transform');
      expect(chevronIcon).toHaveClass('duration-200');
      expect(chevronIcon).toHaveClass('ease-in-out');
    });
  });

  // ────────────────────────────────────
  // 6. ARIA attributes
  // ────────────────────────────────────
  describe('accessibility (ARIA)', () => {
    it('sets aria-expanded correctly on toggle buttons', () => {
      render(<Ledger />);
      const expandButton = getExpandButton('ENT-0001', 3);
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(expandButton);
      const collapseButton = getCollapseButton('ENT-0001');
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('sets aria-controls on toggle buttons linking to sub-event container', () => {
      render(<Ledger />);
      const expandButton = getExpandButton('ENT-0001', 3);
      expect(expandButton).toHaveAttribute(
        'aria-controls',
        'sub-events-ENT-0001',
      );
    });

    it('the sub-event container has the matching id', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0001', 3));
      expect(
        document.getElementById('sub-events-ENT-0001'),
      ).toBeInTheDocument();
    });

    it('uses aria-label with sub-event count on expand button', () => {
      render(<Ledger />);
      const btn = getExpandButton('ENT-0003', 8);
      expect(btn).toHaveAttribute(
        'aria-label',
        'Expand 8 sub-events for ENT-0003',
      );
    });

    it('has a live region for screen reader announcements', () => {
      render(<Ledger />);
      const liveRegion = screen.getByTestId('ledger-live-region');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('announces expand/collapse messages via the live region', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0001', 3));
      const liveRegion = screen.getByTestId('ledger-live-region');
      expect(liveRegion).toHaveTextContent(/ENT-0001 expanded/);
    });

    it('disabled rows have aria-expanded false', () => {
      render(<Ledger />);
      const disabledButton = getDisabledButton('ENT-0005');
      expect(disabledButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('parent rows expose expand state via the toggle button, not the row', () => {
      render(<Ledger />);
      const expandButton = getExpandButton('ENT-0001', 3);
      const parentRow = expandButton.closest('tr');
      // aria-expanded is valid on the toggle button (rows are plain grid rows)
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      expect(parentRow).not.toHaveAttribute('aria-expanded');

      fireEvent.click(expandButton);

      const collapseButton = getCollapseButton('ENT-0001');
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
      expect(collapseButton.closest('tr')).not.toHaveAttribute('aria-expanded');
    });
  });

  // ────────────────────────────────────
  // 7. Focus management
  // ────────────────────────────────────
  describe('focus management', () => {
    it('returns focus to the toggle button after collapse', () => {
      render(<Ledger />);
      const expandButton = getExpandButton('ENT-0001', 3);
      fireEvent.click(expandButton);

      const collapseButton = getCollapseButton('ENT-0001');
      collapseButton.focus();
      fireEvent.click(collapseButton);

      // After collapse, the expand button should be back
      const newExpandButton = getExpandButton('ENT-0001', 3);
      expect(newExpandButton).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────
  // 8. Sub-event count badge
  // ────────────────────────────────────
  describe('sub-event count badge', () => {
    it('shows a badge with sub-event count next to the chevron', () => {
      render(<Ledger />);
      const expandButton = getExpandButton('ENT-0001', 3);
      const td = expandButton.closest('td');
      const badge = td?.querySelector('span[aria-hidden="true"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3');
    });

    it('does not show a count badge for rows with empty subEvents', () => {
      render(<Ledger />);
      const btn = getExpandButton('ENT-0004', 0);
      const td = btn.closest('td');
      const badge = td?.querySelector('span[aria-hidden="true"]');
      expect(badge).toBeNull();
    });

    it('does not render a badge for rows with no subEvents at all', () => {
      render(<Ledger />);
      const btn = getDisabledButton('ENT-0005');
      const td = btn.closest('td');
      const badge = td?.querySelector('span[aria-hidden="true"]');
      expect(badge).toBeNull();
    });
  });

  // ────────────────────────────────────
  // 9. Pagination
  // ────────────────────────────────────
  describe('pagination', () => {
    it('navigates to the next page using page numbers', () => {
      render(<Ledger />);
      expect(
        screen.getByText(/Showing 1 to 10 of 50 results/),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

      expect(
        screen.getByText(/Showing 11 to 20 of 50 results/),
      ).toBeInTheDocument();
    });

    it('can go back to the previous page', () => {
      render(<Ledger />);
      fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));

      expect(
        screen.getByText(/Showing 21 to 30 of 50 results/),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));

      expect(
        screen.getByText(/Showing 1 to 10 of 50 results/),
      ).toBeInTheDocument();
    });

    it('disables previous arrow button on first page', () => {
      render(<Ledger />);
      const nav = screen.getByRole('navigation', { name: 'Pagination' });
      const prevBtn = within(nav).getByRole('button', {
        name: 'Previous page',
      });
      expect(prevBtn).toBeDisabled();
    });

    it('disables next arrow button on last page', () => {
      render(<Ledger />);
      fireEvent.click(screen.getByRole('button', { name: 'Page 5' }));

      const nav = screen.getByRole('navigation', { name: 'Pagination' });
      const nextBtn = within(nav).getByRole('button', { name: 'Next page' });
      expect(nextBtn).toBeDisabled();
    });

    it('clicking a page number button goes to that page', () => {
      render(<Ledger />);
      fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));
      expect(
        screen.getByText(/Showing 21 to 30 of 50 results/),
      ).toBeInTheDocument();
    });

    it('current page button has aria-current="page"', () => {
      render(<Ledger />);
      expect(
        screen.getByRole('button', { name: 'Page 1' }),
      ).toHaveAttribute('aria-current', 'page');

      expect(
        screen.getByRole('button', { name: 'Page 2' }),
      ).not.toHaveAttribute('aria-current');
    });

    it('next arrow button navigates forward', () => {
      render(<Ledger />);
      const nav = screen.getByRole('navigation', { name: 'Pagination' });
      const nextBtn = within(nav).getByRole('button', {
        name: 'Next page',
      });
      expect(nextBtn).toBeEnabled();
      fireEvent.click(nextBtn);
      expect(
        screen.getByText(/Showing 11 to 20 of 50 results/),
      ).toBeInTheDocument();
    });

    it('previous arrow button navigates backward', () => {
      render(<Ledger />);
      const nav = screen.getByRole('navigation', { name: 'Pagination' });
      const nextBtn = within(nav).getByRole('button', {
        name: 'Next page',
      });
      fireEvent.click(nextBtn);
      fireEvent.click(nextBtn);

      const prevBtn = within(nav).getByRole('button', {
        name: 'Previous page',
      });
      expect(prevBtn).toBeEnabled();
      fireEvent.click(prevBtn);
      expect(
        screen.getByText(/Showing 11 to 20 of 50 results/),
      ).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────
  // 10. Expanded state persistence across pages
  // ────────────────────────────────────
  describe('expanded state persistence across paging', () => {
    it('keeps rows expanded when navigating pages', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0001', 3));

      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
      expect(
        screen.getByText(/Showing 11 to 20 of 50 results/),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));

      expect(
        screen.getByRole('grid', { name: /Sub-events detail for ENT-0001/ }),
      ).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────
  // 11. Status and type badges
  // ────────────────────────────────────
  describe('status and type badges', () => {
    it('renders status badges with correct text', () => {
      render(<Ledger />);
      const confirmedBadges = screen.getAllByText('confirmed');
      expect(confirmedBadges.length).toBeGreaterThan(0);
    });

    it('renders type badges with correct text', () => {
      render(<Ledger />);
      const investmentBadges = screen.getAllByText('investment');
      expect(investmentBadges.length).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────
  // 12. Edge case: many sub-events
  // ────────────────────────────────────
  describe('edge case: many sub-events', () => {
    it('renders all 8 sub-events for a row with many nested rows', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0003', 8));

      const subTable = screen.getByRole('grid', {
        name: /Sub-events detail for ENT-0003/,
      });
      const subRows = subTable.querySelectorAll('tbody > tr');
      expect(subRows.length).toBe(8);
    });
  });

  // ────────────────────────────────────
  // 13. Mobile responsive layout
  // ────────────────────────────────────
  describe('mobile layout', () => {
    it('renders mobile cards with list role on small screens', () => {
      render(<Ledger />);
      const mobileList = screen.getByRole('list', {
        name: 'Ledger entries',
      });
      expect(mobileList).toBeInTheDocument();
      expect(mobileList).toHaveClass('sm:hidden');
    });

    it('mobile cards have expand buttons', () => {
      render(<Ledger />);
      // Both desktop and mobile buttons exist using querySelector
      const buttons = document.querySelectorAll(
        'button[aria-label="Expand 3 sub-events for ENT-0001"]',
      );
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('desktop table is hidden on small screens', () => {
      render(<Ledger />);
      const desktopTable = screen.getByRole('grid', {
        name: 'Ledger entries table',
      });
      expect(desktopTable).toHaveClass('hidden');
      expect(desktopTable).toHaveClass('sm:table');
    });

    it('mobile expanded sub-events show in card format', () => {
      render(<Ledger />);
      const mobileList = screen.getByRole('list', {
        name: 'Ledger entries',
      });
      const mobileBtn = mobileList.querySelector(
        'button[aria-label="Expand 3 sub-events for ENT-0001"]',
      ) as HTMLElement;
      expect(mobileBtn).toBeInTheDocument();
      fireEvent.click(mobileBtn);

      expect(
        within(mobileList).getByRole('region', {
          name: /Sub-events for ENT-0001/,
        }),
      ).toBeInTheDocument();

      expect(
        within(mobileList).getByText('Sub-events (3)'),
      ).toBeInTheDocument();
    });

    it('mobile shows empty message for empty subEvents', () => {
      render(<Ledger />);
      const mobileList = screen.getByRole('list', {
        name: 'Ledger entries',
      });
      const mobileEmptyBtn = mobileList.querySelector(
        'button[aria-label="Expand 0 sub-events for ENT-0004"]',
      ) as HTMLElement;
      expect(mobileEmptyBtn).toBeInTheDocument();
      fireEvent.click(mobileEmptyBtn);

      expect(
        within(mobileList).getByText('No related events for this entry.'),
      ).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────
  // 14. Expanded row styling
  // ────────────────────────────────────
  describe('expanded row styling', () => {
    it('expanded parent row receives distinct background styling', () => {
      render(<Ledger />);
      const expandButton = getExpandButton('ENT-0001', 3);
      const rowBefore = expandButton.closest('tr');
      expect(rowBefore).not.toHaveClass('bg-blue-50/40');

      fireEvent.click(expandButton);

      const collapseButton = getCollapseButton('ENT-0001');
      const rowAfter = collapseButton.closest('tr');
      expect(rowAfter).toHaveClass('bg-blue-50/40');
      expect(rowAfter).toHaveClass('border-l-4');
      expect(rowAfter).toHaveClass('border-l-blue-400');
    });

    it('sub-event row also has blue background', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0001', 3));

      const subContainer = document.getElementById('sub-events-ENT-0001');
      expect(subContainer).toBeInTheDocument();
      expect(subContainer).toHaveClass('bg-blue-50/20');
      expect(subContainer).toHaveClass('border-l-blue-400');
    });
  });

  // ────────────────────────────────────
  // 15. Amount formatting
  // ────────────────────────────────────
  describe('amount formatting', () => {
    it('displays amounts with dollar sign and two decimal places', () => {
      render(<Ledger />);
      const amountCells = screen.getAllByText(/^\$\d+\.\d{2}$/);
      expect(amountCells.length).toBeGreaterThan(0);
    });

    it('sub-event amounts are also formatted', () => {
      render(<Ledger />);
      fireEvent.click(getExpandButton('ENT-0001', 3));

      const subTable = screen.getByRole('grid', {
        name: /Sub-events detail for ENT-0001/,
      });
      const amounts = subTable.querySelectorAll('td');
      const amountTexts = Array.from(amounts)
        .map((td) => td.textContent ?? '')
        .filter((text) => /^\$\d+\.\d{2}$/.test(text));
      expect(amountTexts.length).toBe(3);
    });
  });

  // ────────────────────────────────────
  // 16. Mobile pagination
  // ────────────────────────────────────
  describe('mobile pagination', () => {
    const mobileBar = () =>
      screen.getByText('1 / 5').closest('div') as HTMLElement;

    it('shows a compact page indicator on mobile', () => {
      render(<Ledger />);
      expect(screen.getByText('1 / 5')).toBeInTheDocument();
    });

    it('previous arrow is disabled on first page', () => {
      render(<Ledger />);
      expect(
        within(mobileBar()).getByRole('button', {
          name: 'Previous page',
        }),
      ).toBeDisabled();
    });

    it('next and previous arrows navigate between pages', () => {
      render(<Ledger />);
      const bar = mobileBar();
      const nextBtn = within(bar).getByRole('button', {
        name: 'Next page',
      });
      fireEvent.click(nextBtn);
      expect(screen.getByText('2 / 5')).toBeInTheDocument();

      const prevBtn = within(bar).getByRole('button', {
        name: 'Previous page',
      });
      fireEvent.click(prevBtn);
      expect(screen.getByText('1 / 5')).toBeInTheDocument();
    });

    it('next arrow is disabled on last page', () => {
      render(<Ledger />);
      const bar = mobileBar();
      const nextBtn = within(bar).getByRole('button', {
        name: 'Next page',
      });
      fireEvent.click(nextBtn);
      fireEvent.click(nextBtn);
      fireEvent.click(nextBtn);
      fireEvent.click(nextBtn);
      expect(screen.getByText('5 / 5')).toBeInTheDocument();
      expect(
        within(bar).getByRole('button', { name: 'Next page' }),
      ).toBeDisabled();
    });
  });
});

// ──────────────────────────────────────────────────────────
// Row grouping and collapse controls (Issue #464)
// ──────────────────────────────────────────────────────────

const desktopGrid = () =>
  screen.getByRole('grid', { name: 'Ledger entries table' });

function selectGroup(mode: string) {
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Group by' }),
    { target: { value: mode } },
  );
}

describe('grouping selector (toolbar)', () => {
  it('renders a group-by selector defaulting to no grouping', () => {
    render(<Ledger />);
    const select = screen.getByRole('combobox', { name: 'Group by' });
    expect(select).toHaveValue('none');
    expect(screen.getByRole('option', { name: 'No grouping' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'By day' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'By batch' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'By payout' })).toBeInTheDocument();
  });

  it('groups rows by batch when selected', () => {
    render(<Ledger />);
    selectGroup('batch');
    const table = desktopGrid();
    expect(within(table).getByRole('button', { name: 'Collapse group Investment' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Collapse group Payout' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Collapse group Distribution' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Collapse group Fee' })).toBeInTheDocument();
  });

  it('groups rows by day when selected', () => {
    render(<Ledger />);
    const table = desktopGrid();
    // Derive the expected label from the date rendered in the first data row.
    const firstDate = within(table).getAllByText(/^\d{4}-\d{2}-\d{2}$/)[0]
      .textContent ?? '';
    const [year, month, day] = firstDate.split('-').map(Number);
    const expectedLabel = new Date(year, month - 1, day).toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric', year: 'numeric' },
    );

    selectGroup('day');
    const groupButtons = within(table).getAllByRole('button', {
      name: /^Collapse group /,
    });
    expect(groupButtons).toHaveLength(10);
    expect(
      within(table).getByRole('button', {
        name: `Collapse group ${expectedLabel}`,
      }),
    ).toBeInTheDocument();
    // Day grouping produces single-item groups.
    expect(groupButtons[0].closest('tr')).toHaveTextContent('1 item');
  });

  it('groups rows by payout status when selected', () => {
    render(<Ledger />);
    selectGroup('payout');
    const table = desktopGrid();
    expect(within(table).getByRole('button', { name: 'Collapse group Confirmed' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Collapse group Pending' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Collapse group Failed' })).toBeInTheDocument();
  });

  it('removes group headers when switching back to no grouping', () => {
    render(<Ledger />);
    selectGroup('batch');
    const table = desktopGrid();
    expect(within(table).getByRole('button', { name: 'Collapse group Investment' })).toBeInTheDocument();
    selectGroup('none');
    expect(within(table).queryByRole('button', { name: 'Collapse group Investment' })).not.toBeInTheDocument();
  });

  it('announces grouping changes in the live region', () => {
    render(<Ledger />);
    selectGroup('batch');
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent('Grouped by Batch');
    selectGroup('none');
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent('Grouping cleared');
  });

  it('shows a group count indicator only while grouping is active', () => {
    render(<Ledger />);
    expect(screen.queryByText('Groups (4)')).not.toBeInTheDocument();
    selectGroup('batch');
    expect(screen.getByText('Groups (4)')).toBeInTheDocument();
  });
});

describe('group header rows with aggregate stats', () => {
  it('renders item count and total amount in the group header', () => {
    render(<Ledger />);
    selectGroup('batch');
    const table = desktopGrid();
    const investmentHeader = within(table)
      .getByRole('button', { name: 'Collapse group Investment' })
      .closest('tr');
    expect(investmentHeader).toHaveTextContent('3 items');
    expect(investmentHeader).toHaveTextContent(/Total \$/);
    const feeHeader = within(table)
      .getByRole('button', { name: 'Collapse group Fee' })
      .closest('tr');
    expect(feeHeader).toHaveTextContent('2 items');
    expect(feeHeader).toHaveTextContent(/Total \$/);
  });

  it('renders single-item groups with singular item count', () => {
    render(<Ledger />);
    selectGroup('day');
    const table = desktopGrid();
    const header = within(table)
      .getByRole('button', { name: 'Collapse group Jan 1, 2025' })
      .closest('tr');
    expect(header).toHaveTextContent('1 item');
    expect(header).toHaveTextContent(/Total \$/);
  });

  it('group total equals the sum of its item amounts', () => {
    render(<Ledger />);
    selectGroup('payout');
    const groupBody = document.getElementById('ledger-group-payout-confirmed');
    expect(groupBody).toBeInTheDocument();
    const amounts = Array.from(groupBody!.querySelectorAll('td'))
      .map((td) => td.textContent ?? '')
      .filter((text) => /^\$\d+\.\d{2}$/.test(text))
      .map((text) => parseFloat(text.slice(1)));
    expect(amounts.length).toBe(4);
    const headerText = groupBody!.querySelector('tr')!.textContent ?? '';
    const match = headerText.match(/Total \$(\d+\.\d{2})/);
    expect(match).not.toBeNull();
    const expected = amounts.reduce((sum, amount) => sum + amount, 0);
    expect(parseFloat(match![1])).toBeCloseTo(expected, 2);
  });
});

describe('collapse and expand group controls', () => {
  it('hides group rows when collapsed and restores them when expanded', () => {
    render(<Ledger />);
    selectGroup('batch');
    const groupBody = document.getElementById('ledger-group-batch-investment');
    expect(groupBody).toBeInTheDocument();
    // Header row + 3 investment entries on page 1.
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(4);

    fireEvent.click(
      within(groupBody!).getByRole('button', { name: 'Collapse group Investment' }),
    );
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(1);
    expect(groupBody!.textContent).not.toContain('ENT-0001');

    fireEvent.click(
      within(groupBody!).getByRole('button', { name: 'Expand group Investment' }),
    );
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(4);
  });

  it('sets aria-expanded on the group toggle button', () => {
    render(<Ledger />);
    selectGroup('batch');
    const table = desktopGrid();
    const toggle = within(table).getByRole('button', { name: 'Collapse group Investment' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(
      within(table).getByRole('button', { name: 'Expand group Investment' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('links the toggle to the group body with aria-controls', () => {
    render(<Ledger />);
    selectGroup('batch');
    const toggle = within(desktopGrid()).getByRole('button', { name: 'Collapse group Investment' });
    expect(toggle).toHaveAttribute('aria-controls', 'ledger-group-batch-investment');
    expect(document.getElementById('ledger-group-batch-investment')).toBeInTheDocument();
  });

  it('announces group collapse and expand via the live region', () => {
    render(<Ledger />);
    selectGroup('batch');
    const table = desktopGrid();
    fireEvent.click(within(table).getByRole('button', { name: 'Collapse group Investment' }));
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent('Group Investment collapsed');
    fireEvent.click(within(table).getByRole('button', { name: 'Expand group Investment' }));
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent('Group Investment expanded');
  });

  it('supports arrow-key expand/collapse on the group toggle', () => {
    render(<Ledger />);
    selectGroup('batch');
    const table = desktopGrid();
    const collapseBtn = within(table).getByRole('button', { name: 'Collapse group Investment' });
    fireEvent.keyDown(collapseBtn, { key: 'ArrowLeft' });
    const expandBtn = within(table).getByRole('button', { name: 'Expand group Investment' });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.keyDown(expandBtn, { key: 'ArrowRight' });
    expect(
      within(table).getByRole('button', { name: 'Collapse group Investment' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('handles all arrow keys and no-op key presses on the group toggle', () => {
    render(<Ledger />);
    selectGroup('batch');
    const table = desktopGrid();

    // ArrowRight on an expanded group is a no-op
    fireEvent.keyDown(
      within(table).getByRole('button', { name: 'Collapse group Investment' }),
      { key: 'ArrowRight' },
    );
    expect(
      within(table).getByRole('button', { name: 'Collapse group Investment' }),
    ).toHaveAttribute('aria-expanded', 'true');

    // ArrowUp collapses an expanded group
    fireEvent.keyDown(
      within(table).getByRole('button', { name: 'Collapse group Investment' }),
      { key: 'ArrowUp' },
    );
    expect(
      within(table).getByRole('button', { name: 'Expand group Investment' }),
    ).toHaveAttribute('aria-expanded', 'false');

    // ArrowDown expands a collapsed group
    fireEvent.keyDown(
      within(table).getByRole('button', { name: 'Expand group Investment' }),
      { key: 'ArrowDown' },
    );
    expect(
      within(table).getByRole('button', { name: 'Collapse group Investment' }),
    ).toHaveAttribute('aria-expanded', 'true');

    // Collapse it again, then ArrowLeft on a collapsed group is a no-op
    fireEvent.keyDown(
      within(table).getByRole('button', { name: 'Collapse group Investment' }),
      { key: 'ArrowUp' },
    );
    fireEvent.keyDown(
      within(table).getByRole('button', { name: 'Expand group Investment' }),
      { key: 'ArrowLeft' },
    );
    expect(
      within(table).getByRole('button', { name: 'Expand group Investment' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('collapse all / expand all', () => {
  it('collapses every group and disables the collapse-all button', () => {
    render(<Ledger />);
    selectGroup('batch');
    const groupBody = document.getElementById('ledger-group-batch-investment');
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Collapse all' })).toBeDisabled();
    expect(
      within(groupBody!).getByRole('button', { name: 'Expand group Investment' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent('All 4 groups collapsed');
  });

  it('expands every group and disables the expand-all button', () => {
    render(<Ledger />);
    selectGroup('batch');
    const groupBody = document.getElementById('ledger-group-batch-investment');
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Expand all' })).toBeDisabled();
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent('All 4 groups expanded');
  });

  it('expand-all is disabled initially when no group is collapsed', () => {
    render(<Ledger />);
    selectGroup('batch');
    expect(screen.getByRole('button', { name: 'Expand all' })).toBeDisabled();
  });
});

describe('sorting within groups', () => {
  it('sorts items within a group by amount ascending', () => {
    render(<Ledger />);
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Sort by' }),
      { target: { value: 'amount' } },
    );
    const table = desktopGrid();
    const amounts = within(table)
      .getAllByText(/^\$\d+\.\d{2}$/)
      .map((el) => parseFloat(el.textContent!.replace(/[^0-9.]/g, '')));
    const sorted = [...amounts].sort((a, b) => a - b);
    expect(amounts).toEqual(sorted);
  });

  it('preserves collapsed state when sorting within a group', () => {
    render(<Ledger />);
    selectGroup('batch');
    const groupBody = document.getElementById('ledger-group-batch-investment');
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(4);

    fireEvent.click(
      within(groupBody!).getByRole('button', { name: 'Collapse group Investment' }),
    );
    expect(groupBody!.querySelectorAll('tr')).toHaveLength(1);

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Sort by' }),
      { target: { value: 'amount' } },
    );

    expect(groupBody!.querySelectorAll('tr')).toHaveLength(1);
    expect(
      within(groupBody!).getByRole('button', { name: 'Expand group Investment' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles sort direction and announces it', () => {
    render(<Ledger />);
    const directionBtn = screen.getByRole('button', { name: /Sort direction/ });
    expect(directionBtn).toHaveAccessibleName('Sort direction: ascending. Click to change.');
    fireEvent.click(directionBtn);
    expect(screen.getByRole('button', { name: /Sort direction/ })).toHaveAccessibleName('Sort direction: descending. Click to change.');
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent('Sort direction descending');
  });

  it('announces ascending when toggling sort direction back', () => {
    render(<Ledger />);
    fireEvent.click(screen.getByRole('button', { name: /Sort direction/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sort direction/ }));
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent(
      'Sort direction ascending',
    );
  });

  it('announces the sort key and direction in sort messages', () => {
    render(<Ledger />);
    const sortSelect = screen.getByRole('combobox', { name: 'Sort by' });

    fireEvent.change(sortSelect, { target: { value: 'amount' } });
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent(
      'Sorted by Amount ascending',
    );

    fireEvent.click(screen.getByRole('button', { name: /Sort direction/ }));
    fireEvent.change(sortSelect, { target: { value: 'date' } });
    expect(screen.getByTestId('ledger-live-region')).toHaveTextContent(
      'Sorted by Date descending',
    );
  });

  it('sorts descending when direction is toggled', () => {
    render(<Ledger />);
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Sort by' }),
      { target: { value: 'amount' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Sort direction/ }));
    const table = desktopGrid();
    const amounts = within(table)
      .getAllByText(/^\$\d+\.\d{2}$/)
      .map((el) => parseFloat(el.textContent!.replace(/[^0-9.]/g, '')));
    const sorted = [...amounts].sort((a, b) => b - a);
    expect(amounts).toEqual(sorted);
  });
});

describe('grouped state persistence', () => {
  it('keeps a group collapsed across pagination', () => {
    render(<Ledger />);
    selectGroup('payout');
    const table = desktopGrid();
    fireEvent.click(
      within(table).getByRole('button', { name: 'Collapse group Confirmed' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    const table2 = desktopGrid();
    expect(
      within(table2).getByRole('button', { name: 'Expand group Confirmed' }),
    ).toHaveAttribute('aria-expanded', 'false');
    const confirmedBody2 = document.getElementById('ledger-group-payout-confirmed');
    expect(confirmedBody2!.querySelectorAll('tr')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));
    const table3 = desktopGrid();
    expect(
      within(table3).getByRole('button', { name: 'Expand group Confirmed' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('nested sub-events still expand inside a grouped row', () => {
    render(<Ledger />);
    selectGroup('batch');
    const table = desktopGrid();
    fireEvent.click(getExpandButton('ENT-0001', 3));
    expect(
      screen.getByRole('grid', { name: /Sub-events detail for ENT-0001/ }),
    ).toBeInTheDocument();
  });
});

describe('mobile group headers', () => {
  it('renders group headers in the mobile list and collapses items', () => {
    render(<Ledger />);
    selectGroup('batch');
    const mobileList = screen.getByRole('list', { name: 'Ledger entries' });
    expect(
      within(mobileList).getByRole('button', { name: 'Collapse group Investment' }),
    ).toBeInTheDocument();
    expect(within(mobileList).getByText('ENT-0001')).toBeInTheDocument();

    fireEvent.click(
      within(mobileList).getByRole('button', { name: 'Collapse group Investment' }),
    );
    expect(within(mobileList).queryByText('ENT-0001')).not.toBeInTheDocument();

    fireEvent.click(
      within(mobileList).getByRole('button', { name: 'Expand group Investment' }),
    );
    expect(within(mobileList).getByText('ENT-0001')).toBeInTheDocument();
  });

  it('nested mobile list carries a distinct label', () => {
    render(<Ledger />);
    selectGroup('batch');
    expect(
      screen.getByRole('list', { name: 'Items in Investment' }),
    ).toBeInTheDocument();
  });

  it('rows inside a mobile group still expand their sub-events', () => {
    render(<Ledger />);
    selectGroup('batch');
    const mobileList = screen.getByRole('list', {
      name: 'Ledger entries',
    });
    const rowToggle = mobileList.querySelector(
      'button[aria-label^="Expand "][aria-label$="for ENT-0001"]',
    );
    expect(rowToggle).toBeInTheDocument();
    fireEvent.click(rowToggle as HTMLElement);
    expect(
      within(mobileList).getByRole('region', {
        name: /Sub-events for ENT-0001/,
      }),
    ).toBeInTheDocument();
  });
});

describe('focus management', () => {
  it('moves focus to the row toggle after expanding', async () => {
    render(<Ledger />);
    fireEvent.click(getExpandButton('ENT-0001', 3));
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute(
        'aria-label',
        expect.stringMatching(/for ENT-0001$/),
      ),
    );
  });
});

describe('accessibility (axe)', () => {
  it('has no axe violations in the default state', async () => {
    const { container } = render(
      <main>
        <Ledger />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when grouped with a collapsed group', async () => {
    const { container } = render(
      <main>
        <Ledger />
      </main>,
    );
    selectGroup('batch');
    fireEvent.click(
      within(desktopGrid()).getByRole('button', { name: 'Collapse group Investment' }),
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
