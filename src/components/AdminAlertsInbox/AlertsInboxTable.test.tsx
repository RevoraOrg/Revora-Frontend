import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AlertsInboxTable } from './AlertsInboxTable';
import type { Alert } from './types';

expect.extend(toHaveNoViolations);

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Fixed timestamp anchor so time-bucket grouping tests are deterministic. */
const NOW = new Date('2026-09-27T12:00:00.000Z').getTime();

const makeAlert = (overrides: Partial<Alert> & Pick<Alert, 'id'>): Alert => ({
  issuerId: 'iss-1',
  issuerName: 'Acme Corp',
  severity: 'medium',
  status: 'active',
  title: `Alert ${overrides.id}`,
  description: `Description for alert ${overrides.id}`,
  createdAt: new Date(NOW - 1000 * 60 * 30).toISOString(), // 30 min ago → "Today"
  ...overrides,
});

const ALERTS: Alert[] = [
  makeAlert({
    id: 'a1',
    issuerName: 'Stellar Tech',
    severity: 'critical',
    status: 'active',
    title: 'Missed Revenue Payment',
    description: 'Monthly revenue share missed by 3 days.',
    createdAt: new Date(NOW - 1000 * 60 * 60 * 2).toISOString(), // 2 h ago → Today
  }),
  makeAlert({
    id: 'a2',
    issuerName: 'Nebula Corp',
    severity: 'high',
    status: 'assigned',
    title: 'Abnormal Trading Volume',
    description: 'Spike in trading volume detected.',
    createdAt: new Date(NOW - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago → Yesterday
    assignedTo: 'admin-1',
  }),
  makeAlert({
    id: 'a3',
    issuerName: 'Galactic Ventures',
    severity: 'medium',
    status: 'acknowledged',
    title: 'KYC Expiry Upcoming',
    description: 'KYC documentation expiring in 5 days.',
    createdAt: new Date(NOW - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago → Last 7 Days
  }),
  makeAlert({
    id: 'a4',
    issuerName: 'Stellar Tech',
    severity: 'low',
    status: 'active',
    title: 'Quarterly Report Due',
    description: 'Quarterly financial report due in 7 days.',
    createdAt: new Date(NOW - 1000 * 60 * 30).toISOString(), // 30 min ago → Today
  }),
  makeAlert({
    id: 'a5',
    issuerName: 'Orion Holdings',
    severity: 'critical',
    status: 'resolved',
    title: 'Compliance Hold Lifted',
    description: 'Regulatory hold successfully resolved.',
    createdAt: new Date(NOW - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago → Last 7 Days
  }),
];

const noop = () => undefined;

const renderTable = (
  alerts: Alert[] = ALERTS,
  {
    onAction = vi.fn(),
    onBulkAction = vi.fn(),
  }: {
    onAction?: ReturnType<typeof vi.fn>;
    onBulkAction?: ReturnType<typeof vi.fn>;
  } = {},
) => {
  const result = render(
    <AlertsInboxTable
      alerts={alerts}
      onAction={onAction}
      onBulkAction={onBulkAction}
    />,
  );
  return { ...result, onAction, onBulkAction };
};

// ─────────────────────────────────────────────────────────────────────────────
// Freeze time so time-bucket calculations are deterministic
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Empty-state (no alerts)
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – empty state', () => {
  it('renders the empty-state UI when alerts array is empty', () => {
    renderTable([]);
    expect(screen.getByText('No alerts')).toBeInTheDocument();
    expect(screen.getByText(/your inbox is empty/i)).toBeInTheDocument();
  });

  it('does not render the toolbar when alerts array is empty', () => {
    renderTable([]);
    expect(screen.queryByPlaceholderText('Search alerts...')).not.toBeInTheDocument();
    expect(screen.queryByText('Group by:')).not.toBeInTheDocument();
  });

  it('does not render any alert rows when alerts array is empty', () => {
    renderTable([]);
    expect(screen.queryByRole('checkbox', { name: /select alert/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Initial render with alerts
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – initial render', () => {
  it('renders all alert titles when supplied with a full list', () => {
    renderTable();
    expect(screen.getByText('Missed Revenue Payment')).toBeInTheDocument();
    expect(screen.getByText('Abnormal Trading Volume')).toBeInTheDocument();
    expect(screen.getByText('KYC Expiry Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Quarterly Report Due')).toBeInTheDocument();
    expect(screen.getByText('Compliance Hold Lifted')).toBeInTheDocument();
  });

  it('shows the total alert count in the table header', () => {
    renderTable();
    expect(screen.getByText(`Alerts (${ALERTS.length})`)).toBeInTheDocument();
  });

  it('renders issuer names in each row', () => {
    renderTable();
    // Stellar Tech appears for two alerts
    const stellarEntries = screen.getAllByText('Stellar Tech');
    expect(stellarEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the search input and grouping buttons', () => {
    renderTable();
    expect(screen.getByPlaceholderText('Search alerts...')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Issuer')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
  });

  it('does not render the bulk-actions bar when nothing is selected', () => {
    renderTable();
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Resolve All')).not.toBeInTheDocument();
  });

  it('renders a per-row selection checkbox for every alert', () => {
    renderTable();
    const checkboxes = screen.getAllByRole('checkbox', { name: /select alert/i });
    expect(checkboxes).toHaveLength(ALERTS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Search / filtering
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – search filtering', () => {
  it('filters by alert title (case-insensitive)', () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: 'missed revenue' },
    });
    expect(screen.getByText('Missed Revenue Payment')).toBeInTheDocument();
    expect(screen.queryByText('Abnormal Trading Volume')).not.toBeInTheDocument();
  });

  it('filters by issuer name (case-insensitive)', () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: 'nebula' },
    });
    expect(screen.getByText('Abnormal Trading Volume')).toBeInTheDocument();
    expect(screen.queryByText('Missed Revenue Payment')).not.toBeInTheDocument();
  });

  it('filters by description content', () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: 'regulatory hold' },
    });
    expect(screen.getByText('Compliance Hold Lifted')).toBeInTheDocument();
    expect(screen.queryByText('Missed Revenue Payment')).not.toBeInTheDocument();
  });

  it('updates the counter in the table header to reflect filtered count', () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: 'Stellar Tech' },
    });
    // Stellar Tech has 2 alerts (a1 + a4)
    expect(screen.getByText('Alerts (2)')).toBeInTheDocument();
  });

  it('shows "no match" notice when query yields no results', () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: 'ZZZNOMATCH123' },
    });
    expect(screen.getByText('No alerts match your search.')).toBeInTheDocument();
  });

  it('restores all alerts after clearing the search input', () => {
    renderTable();
    const search = screen.getByPlaceholderText('Search alerts...');
    fireEvent.change(search, { target: { value: 'Nebula' } });
    expect(screen.queryByText('Missed Revenue Payment')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getByText('Missed Revenue Payment')).toBeInTheDocument();
    expect(screen.getByText(`Alerts (${ALERTS.length})`)).toBeInTheDocument();
  });

  it('select-all becomes unchecked when search narrows the visible set', () => {
    renderTable();

    // Select all 5 alerts first
    fireEvent.click(screen.getByLabelText('Select all alerts'));
    expect(screen.getByLabelText('Select all alerts')).toBeChecked();

    // Filter so only 2 match — the header reflects filteredAlerts.length (2) vs
    // selectedIds that still contain 5 ids, so checked = (5 === 2) → false
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: 'Stellar' },
    });
    expect(screen.getByLabelText('Select all alerts')).not.toBeChecked();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Grouping strategies
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – grouping', () => {
  it('defaults to "none" grouping (no group headers rendered)', () => {
    renderTable();
    expect(screen.queryByText(/priority/i)).not.toBeInTheDocument();
  });

  it('groups alerts by severity', () => {
    renderTable();
    fireEvent.click(screen.getByText('Severity'));
    expect(screen.getByText('Critical Priority (2)')).toBeInTheDocument();
    expect(screen.getByText('High Priority (1)')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority (1)')).toBeInTheDocument();
    expect(screen.getByText('Low Priority (1)')).toBeInTheDocument();
  });

  it('groups alerts by issuer', () => {
    renderTable();
    fireEvent.click(screen.getByText('Issuer'));
    expect(screen.getByText('Stellar Tech (2)')).toBeInTheDocument();
    expect(screen.getByText('Nebula Corp (1)')).toBeInTheDocument();
    expect(screen.getByText('Galactic Ventures (1)')).toBeInTheDocument();
    expect(screen.getByText('Orion Holdings (1)')).toBeInTheDocument();
  });

  it('groups alerts by time (Today / Yesterday / Last 7 Days)', () => {
    renderTable();
    fireEvent.click(screen.getByText('Time'));
    // a1 (2h ago) + a4 (30m ago) → Today; a2 (1d ago) → Yesterday; a3 (2d) + a5 (3d) → Last 7 Days
    expect(screen.getByText(/Today \(/i)).toBeInTheDocument();
    expect(screen.getByText(/Yesterday \(/i)).toBeInTheDocument();
    expect(screen.getByText(/Last 7 Days \(/i)).toBeInTheDocument();
  });

  it('returns to ungrouped view when "None" is clicked after grouping', () => {
    renderTable();
    fireEvent.click(screen.getByText('Severity'));
    expect(screen.getByText('Critical Priority (2)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('None'));
    expect(screen.queryByText(/priority/i)).not.toBeInTheDocument();
  });

  it('switches grouping strategy without losing alerts', () => {
    renderTable();
    fireEvent.click(screen.getByText('Severity'));
    fireEvent.click(screen.getByText('Issuer'));
    expect(screen.getByText('Missed Revenue Payment')).toBeInTheDocument();
    expect(screen.getByText('Compliance Hold Lifted')).toBeInTheDocument();
  });

  it('combines search + grouping correctly (filter then group)', () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: 'Stellar' },
    });
    fireEvent.click(screen.getByText('Severity'));
    // Only Stellar Tech's two alerts remain → critical (1) + low (1)
    expect(screen.getByText('Critical Priority (1)')).toBeInTheDocument();
    expect(screen.getByText('Low Priority (1)')).toBeInTheDocument();
    expect(screen.queryByText('High Priority')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Row-level selection
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – row selection', () => {
  it('selects a single alert row via its checkbox', () => {
    renderTable();
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select alert: Missed Revenue Payment',
    });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText('1 alert selected')).toBeInTheDocument();
  });

  it('deselects an already-selected alert row', () => {
    renderTable();
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select alert: Missed Revenue Payment',
    });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it('pluralizes the selection count label correctly for multiple alerts', () => {
    renderTable();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Missed Revenue Payment' }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Quarterly Report Due' }),
    );
    expect(screen.getByText('2 alerts selected')).toBeInTheDocument();
  });

  it('can select multiple independent rows', () => {
    renderTable();
    const titles = [
      'Missed Revenue Payment',
      'Abnormal Trading Volume',
      'KYC Expiry Upcoming',
    ];
    for (const title of titles) {
      fireEvent.click(screen.getByRole('checkbox', { name: `Select alert: ${title}` }));
    }
    expect(screen.getByText('3 alerts selected')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Select-all / deselect-all
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – select all', () => {
  it('selects all alerts when the header checkbox is checked', () => {
    renderTable();
    fireEvent.click(screen.getByLabelText('Select all alerts'));
    expect(screen.getByText(`${ALERTS.length} alerts selected`)).toBeInTheDocument();
    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select alert/i });
    rowCheckboxes.forEach((cb) => expect(cb).toBeChecked());
  });

  it('deselects all alerts when header checkbox is unchecked after selecting all', () => {
    renderTable();
    const selectAll = screen.getByLabelText('Select all alerts');
    fireEvent.click(selectAll); // select all
    fireEvent.click(selectAll); // deselect all
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select alert/i });
    rowCheckboxes.forEach((cb) => expect(cb).not.toBeChecked());
  });

  it('marks header checkbox as checked when all rows are individually selected', () => {
    renderTable();
    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select alert/i });
    for (const cb of rowCheckboxes) {
      fireEvent.click(cb);
    }
    expect(screen.getByLabelText('Select all alerts')).toBeChecked();
  });

  it('header checkbox is NOT checked when only some rows are selected', () => {
    renderTable();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Missed Revenue Payment' }),
    );
    expect(screen.getByLabelText('Select all alerts')).not.toBeChecked();
  });

  it('select-all only covers filtered alerts during an active search', () => {
    renderTable();
    // Filter to Stellar Tech (2 alerts)
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: 'Stellar Tech' },
    });
    fireEvent.click(screen.getByLabelText('Select all alerts'));
    expect(screen.getByText('2 alerts selected')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Bulk actions bar
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – bulk actions', () => {
  it('reveals bulk-action bar only when at least one row is selected', () => {
    renderTable();
    expect(screen.queryByText('Resolve All')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Missed Revenue Payment' }),
    );
    expect(screen.getByText('Resolve All')).toBeInTheDocument();
    expect(screen.getByText('Acknowledge All')).toBeInTheDocument();
    expect(screen.getByText('Assign All')).toBeInTheDocument();
  });

  it('calls onBulkAction with selected ids for "acknowledge"', () => {
    const onBulkAction = vi.fn();
    renderTable(ALERTS, { onBulkAction });

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Missed Revenue Payment' }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Quarterly Report Due' }),
    );
    fireEvent.click(screen.getByText('Acknowledge All'));

    expect(onBulkAction).toHaveBeenCalledOnce();
    expect(onBulkAction).toHaveBeenCalledWith(
      expect.arrayContaining(['a1', 'a4']),
      'acknowledge',
    );
  });

  it('calls onBulkAction with selected ids for "assign"', () => {
    const onBulkAction = vi.fn();
    renderTable(ALERTS, { onBulkAction });

    fireEvent.click(screen.getByLabelText('Select all alerts'));
    fireEvent.click(screen.getByText('Assign All'));

    expect(onBulkAction).toHaveBeenCalledWith(
      expect.arrayContaining(['a1', 'a2', 'a3', 'a4', 'a5']),
      'assign',
    );
  });

  it('calls onBulkAction with selected ids for "resolve"', () => {
    const onBulkAction = vi.fn();
    renderTable(ALERTS, { onBulkAction });

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: KYC Expiry Upcoming' }),
    );
    fireEvent.click(screen.getByText('Resolve All'));

    expect(onBulkAction).toHaveBeenCalledWith(['a3'], 'resolve');
  });

  it('clears selection after a bulk action is performed', () => {
    renderTable();
    fireEvent.click(screen.getByLabelText('Select all alerts'));
    fireEvent.click(screen.getByText('Resolve All'));
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Resolve All')).not.toBeInTheDocument();
  });

  it('bulk-action bar hides automatically after selection is cleared', () => {
    renderTable();
    const cb = screen.getByRole('checkbox', {
      name: 'Select alert: Missed Revenue Payment',
    });
    fireEvent.click(cb);
    expect(screen.getByText('Resolve All')).toBeInTheDocument();

    fireEvent.click(cb); // deselect
    expect(screen.queryByText('Resolve All')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Per-row onAction callbacks
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – per-row actions via AlertRow', () => {
  it('forwards onAction to AlertRow (each row has a selection checkbox)', () => {
    const onAction = vi.fn();
    renderTable(ALERTS, { onAction });
    // Every AlertRow must render its per-row checkbox
    expect(
      screen.getByRole('checkbox', { name: 'Select alert: Missed Revenue Payment' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Select alert: Compliance Hold Lifted' }),
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Boundary / edge inputs
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – boundary and edge cases', () => {
  it('renders a single alert without errors', () => {
    const single = [
      makeAlert({ id: 'only', title: 'The Only Alert', issuerName: 'Solo Inc' }),
    ];
    renderTable(single);
    expect(screen.getByText('The Only Alert')).toBeInTheDocument();
    expect(screen.getByText('Alerts (1)')).toBeInTheDocument();
  });

  it('handles an alert with no assignedTo field', () => {
    const noAssign: Alert[] = [makeAlert({ id: 'x1', assignedTo: undefined })];
    expect(() => renderTable(noAssign)).not.toThrow();
    expect(screen.getByText('Alerts (1)')).toBeInTheDocument();
  });

  it('handles all four severity levels present simultaneously', () => {
    const allSeverities: Alert[] = (
      ['critical', 'high', 'medium', 'low'] as const
    ).map((sev, i) => makeAlert({ id: `sev-${i}`, severity: sev, title: `${sev} alert` }));
    renderTable(allSeverities);
    fireEvent.click(screen.getByText('Severity'));
    expect(screen.getByText('Critical Priority (1)')).toBeInTheDocument();
    expect(screen.getByText('High Priority (1)')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority (1)')).toBeInTheDocument();
    expect(screen.getByText('Low Priority (1)')).toBeInTheDocument();
  });

  it('handles all four alert statuses without render errors', () => {
    const allStatuses: Alert[] = (
      ['active', 'acknowledged', 'assigned', 'resolved'] as const
    ).map((st, i) => makeAlert({ id: `st-${i}`, status: st, title: `${st} alert` }));
    expect(() => renderTable(allStatuses)).not.toThrow();
    expect(screen.getByText('Alerts (4)')).toBeInTheDocument();
  });

  it('handles special characters in titles/descriptions during search', () => {
    const special: Alert[] = [
      makeAlert({
        id: 'sp1',
        title: 'Alert & <Test>',
        description: 'has <b>HTML</b> & entities',
      }),
    ];
    renderTable(special);
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: '<Test>' },
    });
    expect(screen.getByText('Alert & <Test>')).toBeInTheDocument();
  });

  it('groups a single-alert list correctly under every grouping mode', () => {
    const one = [makeAlert({ id: 's', issuerName: 'Solo', severity: 'high', title: 'Solo Alert' })];
    renderTable(one);

    fireEvent.click(screen.getByText('Severity'));
    expect(screen.getByText('High Priority (1)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Issuer'));
    expect(screen.getByText('Solo (1)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('None'));
    expect(screen.getByText('Solo Alert')).toBeInTheDocument();
  });

  it('renders correctly when alerts prop is updated (re-render with new data)', () => {
    const { rerender } = renderTable(ALERTS);
    expect(screen.getByText(`Alerts (${ALERTS.length})`)).toBeInTheDocument();

    const subset = ALERTS.slice(0, 2);
    rerender(
      <AlertsInboxTable alerts={subset} onAction={noop} onBulkAction={noop} />,
    );
    expect(screen.getByText('Alerts (2)')).toBeInTheDocument();
    expect(screen.queryByText('KYC Expiry Upcoming')).not.toBeInTheDocument();
  });

  it('transitions from non-empty to empty alerts (shows empty state, no crash)', () => {
    const { rerender } = renderTable(ALERTS);
    expect(screen.getByText('Missed Revenue Payment')).toBeInTheDocument();

    rerender(<AlertsInboxTable alerts={[]} onAction={noop} onBulkAction={noop} />);
    expect(screen.getByText('No alerts')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Time-based grouping: boundary buckets
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – time grouping buckets', () => {
  it('places an alert created 6 days ago in "Last 7 Days"', () => {
    const alerts: Alert[] = [
      makeAlert({
        id: 't1',
        title: 'Six Day Old',
        createdAt: new Date(NOW - 1000 * 60 * 60 * 24 * 6).toISOString(),
      }),
    ];
    renderTable(alerts);
    fireEvent.click(screen.getByText('Time'));
    expect(screen.getByText('Last 7 Days (1)')).toBeInTheDocument();
  });

  it('places an alert created 8 days ago in "Older"', () => {
    const alerts: Alert[] = [
      makeAlert({
        id: 't2',
        title: 'Eight Day Old',
        createdAt: new Date(NOW - 1000 * 60 * 60 * 24 * 8).toISOString(),
      }),
    ];
    renderTable(alerts);
    fireEvent.click(screen.getByText('Time'));
    expect(screen.getByText('Older (1)')).toBeInTheDocument();
  });

  it('places an alert created today (within the same day) in "Today"', () => {
    const alerts: Alert[] = [
      makeAlert({
        id: 't3',
        title: 'Brand New',
        createdAt: new Date(NOW - 1000 * 60 * 5).toISOString(), // 5 min ago
      }),
    ];
    renderTable(alerts);
    fireEvent.click(screen.getByText('Time'));
    expect(screen.getByText('Today (1)')).toBeInTheDocument();
  });

  it('places an alert created exactly 1 day ago in "Yesterday"', () => {
    const alerts: Alert[] = [
      makeAlert({
        id: 't4',
        title: 'Day Old',
        createdAt: new Date(NOW - 1000 * 60 * 60 * 24).toISOString(),
      }),
    ];
    renderTable(alerts);
    fireEvent.click(screen.getByText('Time'));
    expect(screen.getByText('Yesterday (1)')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Accessibility
// Note: axe uses setTimeout internally and must run with real timers.
//       Each test restores real timers before calling axe then re-enables fake
//       timers so the global afterEach still cleans up correctly.
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – accessibility', () => {
  it('has no axe violations in the default (non-empty) state', async () => {
    const { container } = renderTable();
    vi.useRealTimers();
    const results = await axe(container);
    vi.useFakeTimers();
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in the empty state', async () => {
    const { container } = renderTable([]);
    vi.useRealTimers();
    const results = await axe(container);
    vi.useFakeTimers();
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when the bulk-action bar is visible', async () => {
    const { container } = renderTable();
    fireEvent.click(screen.getByLabelText('Select all alerts'));
    vi.useRealTimers();
    const results = await axe(container);
    vi.useFakeTimers();
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations after applying a grouping strategy', async () => {
    const { container } = renderTable();
    fireEvent.click(screen.getByText('Severity'));
    vi.useRealTimers();
    const results = await axe(container);
    vi.useFakeTimers();
    expect(results).toHaveNoViolations();
  });

  it('search input has an accessible aria-label', () => {
    renderTable();
    expect(screen.getByRole('textbox', { name: 'Search alerts' })).toBeInTheDocument();
  });

  it('header select-all checkbox has an accessible label', () => {
    renderTable();
    expect(screen.getByRole('checkbox', { name: 'Select all alerts' })).toBeInTheDocument();
  });

  it('per-row checkboxes carry alert-title-qualified labels', () => {
    renderTable();
    expect(
      screen.getByRole('checkbox', { name: 'Select alert: Missed Revenue Payment' }),
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. State machine: selection ↔ search ↔ grouping interactions
// ─────────────────────────────────────────────────────────────────────────────
describe('AlertsInboxTable – state interactions', () => {
  it('bulk-action count reflects the number of selected rows', () => {
    renderTable();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Missed Revenue Payment' }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Abnormal Trading Volume' }),
    );
    expect(screen.getByText('2 alerts selected')).toBeInTheDocument();
  });

  it('switching grouping strategy does not clear existing selection', () => {
    renderTable();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Missed Revenue Payment' }),
    );
    expect(screen.getByText('1 alert selected')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Severity'));
    // Selection should persist across grouping change
    expect(screen.getByText('1 alert selected')).toBeInTheDocument();
  });

  it('select-all header reflects filteredAlerts length, not total alerts length', () => {
    renderTable();
    // Select all 5
    fireEvent.click(screen.getByLabelText('Select all alerts'));
    expect(screen.getByText('5 alerts selected')).toBeInTheDocument();

    // Narrow to 2 alerts
    fireEvent.change(screen.getByPlaceholderText('Search alerts...'), {
      target: { value: 'Stellar' },
    });

    // The table header reflects 2 filtered alerts
    expect(screen.getByText('Alerts (2)')).toBeInTheDocument();
    // The select-all checkbox is no longer checked (5 selected ≠ 2 filtered)
    expect(screen.getByLabelText('Select all alerts')).not.toBeChecked();
  });

  it('onBulkAction receives only currently-selected ids at call time', () => {
    const onBulkAction = vi.fn();
    renderTable(ALERTS, { onBulkAction });

    // Select two alerts then deselect one before acting
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: Missed Revenue Payment' }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: KYC Expiry Upcoming' }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select alert: KYC Expiry Upcoming' }),
    ); // deselect a3

    fireEvent.click(screen.getByText('Resolve All'));
    expect(onBulkAction).toHaveBeenCalledWith(['a1'], 'resolve');
  });
});
