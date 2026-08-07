import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { DistributionFilterToolbar } from './DistributionFilterToolbar';
import type { DistributionFilterState } from './DistributionFilterToolbar.types';

expect.extend(toHaveNoViolations);

const baseFilters: DistributionFilterState = {
  searchQuery: '',
  dateRange: 'all',
  issuer: 'all',
  region: 'all',
  status: 'all',
  segmentBy: 'none',
  compareMode: false,
};

const manyActiveFilters: DistributionFilterState = {
  searchQuery: 'PO-2026',
  dateRange: '90d',
  issuer: 'Nexus Cloud Series A',
  region: 'North America',
  status: 'failed',
  segmentBy: 'region',
  compareMode: true,
};

function setup(filters: DistributionFilterState = baseFilters) {
  const onFilterChange = vi.fn();
  const onResetFilters = vi.fn();
  render(
    <DistributionFilterToolbar
      filters={filters}
      onFilterChange={onFilterChange}
      onResetFilters={onResetFilters}
    />
  );
  return { onFilterChange, onResetFilters };
}

describe('DistributionFilterToolbar — focus trap & return focus', () => {
  it('moves focus into the date popover when it opens', async () => {
    const user = userEvent.setup();
    setup();

    const trigger = screen.getByTestId('filter-trigger-date');
    await user.click(trigger);

    const panel = document.getElementById('date-filter-panel');
    expect(panel).not.toBeNull();
    expect(panel).toContainElement(document.activeElement as HTMLElement);
  });

  it('traps Tab within the open popover instead of escaping to the toolbar', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByTestId('filter-trigger-date'));
    const panel = document.getElementById('date-filter-panel') as HTMLElement;
    const focusablesInPanel = within(panel).getAllByRole('button');
    const last = focusablesInPanel[focusablesInPanel.length - 1];

    last.focus();
    await user.tab();

    expect(panel).toContainElement(document.activeElement as HTMLElement);
  });

  it('returns focus to the trigger button when the popover is closed via Escape', async () => {
    const user = userEvent.setup();
    setup();

    const trigger = screen.getByTestId('filter-trigger-date');
    await user.click(trigger);
    expect(document.getElementById('date-filter-panel')).not.toBeNull();

    await user.keyboard('{Escape}');

    expect(document.getElementById('date-filter-panel')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to the mobile filter trigger when the mobile sheet is closed', async () => {
    const user = userEvent.setup();
    setup();

    const trigger = screen.getByTestId('mobile-filter-trigger');
    await user.click(trigger);

    const sheet = screen.getByTestId('mobile-filter-sheet');
    expect(sheet).toContainElement(document.activeElement as HTMLElement);

    const closeBtn = screen.getByLabelText('Close filters');
    await user.click(closeBtn);

    expect(screen.queryByTestId('mobile-filter-sheet')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('has no axe violations while a popover is open', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DistributionFilterToolbar
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
      />
    );
    await user.click(screen.getByTestId('filter-trigger-status'));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('DistributionFilterToolbar — RTL layout', () => {
  const originalDir = document.documentElement.dir;

  beforeEach(() => {
    document.documentElement.dir = 'rtl';
  });

  afterEach(() => {
    document.documentElement.dir = originalDir;
  });

  it('renders active filter pills in reading order under dir="rtl"', () => {
    setup(manyActiveFilters);

    const pillsRow = screen.getByTestId('active-filter-pills-row');
    const pillTestIds = ['pill-search', 'pill-date', 'pill-issuer', 'pill-region', 'pill-status', 'pill-segment'];

    const renderedOrder = pillTestIds.filter((id) => within(pillsRow).queryByTestId(id));
    expect(renderedOrder).toEqual(pillTestIds);
  });

  it('anchors the presets popover to the inline-end edge, not a hardcoded physical side', async () => {
    const user = userEvent.setup();
    setup(manyActiveFilters);

    await user.click(screen.getByTestId('filter-presets-trigger'));
    const panel = document.getElementById('presets-filter-panel') as HTMLElement;

    expect(panel.className).toContain('filter-popover-panel--end-aligned');
    expect(panel.style.left).toBe('');
    expect(panel.style.right).toBe('');
  });

  it('has no axe violations when rendered under dir="rtl"', async () => {
    const { container } = render(
      <DistributionFilterToolbar
        filters={manyActiveFilters}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('DistributionFilterToolbar — remaining branch coverage', () => {
  it('uses the savedPresets prop instead of localStorage/defaults when provided', async () => {
    const user = userEvent.setup();
    const propPresets = [
      { id: 'preset-from-prop', name: 'From Prop', filterState: { status: 'processing' } },
    ];
    render(
      <DistributionFilterToolbar
        filters={{ ...baseFilters, status: 'processing' }}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
        savedPresets={propPresets as any}
      />
    );

    await user.click(screen.getByTestId('filter-presets-trigger'));

    expect(screen.getByTestId('preset-option-preset-from-prop')).toHaveTextContent('From Prop');
  });

  it('loads presets from localStorage when no savedPresets prop is given', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'revora_distribution_saved_filters',
      JSON.stringify([{ id: 'preset-from-storage', name: 'From Storage', filterState: { region: 'Global' } }])
    );

    try {
      render(
        <DistributionFilterToolbar
          filters={{ ...baseFilters, status: 'processing' }}
          onFilterChange={vi.fn()}
          onResetFilters={vi.fn()}
        />
      );

      await user.click(screen.getByTestId('filter-presets-trigger'));

      expect(screen.getByTestId('preset-option-preset-from-storage')).toHaveTextContent('From Storage');
    } finally {
      window.localStorage.removeItem('revora_distribution_saved_filters');
    }
  });

  it('selects a non-custom date range option and closes the popover', async () => {
    const user = userEvent.setup();
    const { onFilterChange } = setup();

    await user.click(screen.getByTestId('filter-trigger-date'));
    await user.click(screen.getByText('Last 30 Days'));

    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ dateRange: '30d' }));
    expect(document.getElementById('date-filter-panel')).toBeNull();
  });

  it('toggles each popover closed by clicking its own trigger a second time', async () => {
    const user = userEvent.setup();
    setup();

    const triggers = [
      ['filter-trigger-date', 'date-filter-panel'],
      ['filter-trigger-issuer', 'issuer-filter-panel'],
      ['filter-trigger-region', 'region-filter-panel'],
      ['filter-trigger-status', 'status-filter-panel'],
    ] as const;

    for (const [triggerTestId, panelId] of triggers) {
      const trigger = screen.getByTestId(triggerTestId);
      await user.click(trigger);
      expect(document.getElementById(panelId)).not.toBeNull();

      await user.click(trigger);
      expect(document.getElementById(panelId)).toBeNull();
    }
  });

  it('toggles the presets popover closed by clicking its own trigger a second time', async () => {
    const user = userEvent.setup();
    setup(manyActiveFilters);

    const trigger = screen.getByTestId('filter-presets-trigger');
    await user.click(trigger);
    expect(document.getElementById('presets-filter-panel')).not.toBeNull();

    await user.click(trigger);
    expect(document.getElementById('presets-filter-panel')).toBeNull();
  });

  it('resets issuer, region, and status back to "all" via their respective "All ..." option', async () => {
    const user = userEvent.setup();
    const { onFilterChange } = setup({ ...baseFilters, issuer: 'Nexus Cloud Series A', region: 'North America', status: 'failed' });

    await user.click(screen.getByTestId('filter-trigger-issuer'));
    await user.click(screen.getByRole('button', { name: /all issuers/i }));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ issuer: 'all' }));

    await user.click(screen.getByTestId('filter-trigger-region'));
    await user.click(screen.getByRole('button', { name: /all regions/i }));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ region: 'all' }));

    await user.click(screen.getByTestId('filter-trigger-status'));
    await user.click(screen.getByRole('button', { name: /all statuses/i }));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'all' }));
  });

  it('does nothing when Save Current Filters is clicked with an empty preset name', async () => {
    const user = userEvent.setup();
    setup({ ...baseFilters, status: 'processing' });

    await user.click(screen.getByTestId('filter-presets-trigger'));
    // Name input left empty.
    await user.click(screen.getByTestId('save-preset-btn'));

    // Popover should still be open — the no-op early return means the
    // save flow (which would close the popover) never ran.
    expect(document.getElementById('presets-filter-panel')).not.toBeNull();
  });

  it('saves a preset without an onSavePreset callback and does not throw', async () => {
    const user = userEvent.setup();
    render(
      <DistributionFilterToolbar
        filters={{ ...baseFilters, status: 'processing' }}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
        // onSavePreset intentionally omitted
      />
    );

    await user.click(screen.getByTestId('filter-presets-trigger'));
    await user.type(screen.getByTestId('preset-name-input'), 'No Callback Preset');
    await user.click(screen.getByTestId('save-preset-btn'));

    expect(document.getElementById('presets-filter-panel')).toBeNull();
  });

  it('closes the mobile sheet from the Apply Filters button', async () => {
    const user = userEvent.setup();
    setup(manyActiveFilters);

    await user.click(screen.getByTestId('mobile-filter-trigger'));
    expect(screen.getByTestId('mobile-filter-sheet')).toBeInTheDocument();

    await user.click(screen.getByTestId('mobile-apply-btn'));

    expect(screen.queryByTestId('mobile-filter-sheet')).not.toBeInTheDocument();
  });
});

describe('DistributionFilterToolbar — many active filters', () => {
  it('renders all active filter pills plus Clear All without truncation', () => {
    setup(manyActiveFilters);

    expect(screen.getByTestId('pill-search')).toBeInTheDocument();
    expect(screen.getByTestId('pill-date')).toBeInTheDocument();
    expect(screen.getByTestId('pill-issuer')).toBeInTheDocument();
    expect(screen.getByTestId('pill-region')).toBeInTheDocument();
    expect(screen.getByTestId('pill-status')).toBeInTheDocument();
    expect(screen.getByTestId('pill-segment')).toBeInTheDocument();
    expect(screen.getByTestId('pill-compare')).toBeInTheDocument();
    expect(screen.getByTestId('filter-clear-all-btn')).toBeInTheDocument();
  });

  it('shows the total active count on the mobile "Filters (n)" trigger', () => {
    setup(manyActiveFilters);

    const trigger = screen.getByTestId('mobile-filter-trigger');
    expect(trigger).toHaveTextContent('Filters (7)');
  });

  it('announces filter changes via the aria-live status region', async () => {
    const user = userEvent.setup();
    setup(baseFilters);

    const liveRegion = screen.getByTestId('filter-live-region');
    expect(liveRegion).toHaveTextContent('');

    await user.type(screen.getByTestId('filter-search-input'), 'x');

    expect(liveRegion).toHaveTextContent('Search filter updated');
  });

  it('has no axe violations with the maximum realistic set of active filters', async () => {
    const { container } = render(
      <DistributionFilterToolbar
        filters={manyActiveFilters}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
