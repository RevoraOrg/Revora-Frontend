import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BlacklistFilterChips } from './BlacklistFilterChips';
import type { BlacklistFilterSelection, FilterChipOption } from './BlacklistFilterChips.types';

expect.extend(toHaveNoViolations);

const OPTIONS: FilterChipOption[] = [
  { id: 'wallet', label: 'Wallet', group: 'source' },
  { id: 'ip', label: 'IP Address', group: 'source' },
  { id: 'email', label: 'Email', group: 'source' },
  { id: 'critical', label: 'Critical', group: 'severity' },
  { id: 'high', label: 'High', group: 'severity' },
  { id: 'medium', label: 'Medium', group: 'severity' },
  { id: 'na', label: 'North America', group: 'region' },
  { id: 'eu', label: 'Europe', group: 'region' },
  { id: 'today', label: 'Today', group: 'createdDate' },
];

const EMPTY_SELECTION: BlacklistFilterSelection = {
  source: [],
  severity: [],
  region: [],
  createdDate: [],
};

const selected = (partial: Partial<BlacklistFilterSelection>): BlacklistFilterSelection => ({
  ...EMPTY_SELECTION,
  ...partial,
});

describe('BlacklistFilterChips', () => {
  const defaultProps = {
    options: OPTIONS,
    selection: EMPTY_SELECTION,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all chips with labels and the filter bar', () => {
    render(<BlacklistFilterChips {...defaultProps} />);

    expect(screen.getByTestId('blacklist-filter-chips')).toBeInTheDocument();
    expect(screen.getByText('Wallet')).toBeInTheDocument();
    expect(screen.getByText('IP Address')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('North America')).toBeInTheDocument();
    expect(screen.getByText('Europe')).toBeInTheDocument();
  });

  it('does not show the active count when nothing is selected', () => {
    render(<BlacklistFilterChips {...defaultProps} />);
    expect(screen.queryByTestId('blacklist-chips-active-count')).not.toBeInTheDocument();
  });

  it('toggles a chip on click and reports the new selection', () => {
    render(<BlacklistFilterChips {...defaultProps} />);

    fireEvent.click(screen.getByTestId('chip-wallet'));
    expect(defaultProps.onChange).toHaveBeenCalledWith(selected({ source: ['wallet'] }));
  });

  it('shows active state and count when a chip is selected', () => {
    render(
      <BlacklistFilterChips
        {...defaultProps}
        selection={selected({ source: ['wallet'], severity: ['critical'] })}
      />
    );

    expect(screen.getByTestId('chip-wallet')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('chip-critical')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('blacklist-chips-active-count')).toHaveTextContent('2 active');
  });

  it('removes a chip from the selection when a selected chip is clicked again', () => {
    render(
      <BlacklistFilterChips
        {...defaultProps}
        selection={selected({ source: ['wallet'] })}
      />
    );

    fireEvent.click(screen.getByTestId('chip-wallet'));
    expect(defaultProps.onChange).toHaveBeenCalledWith(EMPTY_SELECTION);
  });

  it('selects a contiguous range within a group using Shift+Click', () => {
    render(<BlacklistFilterChips {...defaultProps} />);

    // Anchor on Critical, then shift-click High => severity [critical, high]
    fireEvent.click(screen.getByTestId('chip-critical'));
    fireEvent.click(screen.getByTestId('chip-medium'), { shiftKey: true });

    const lastCall = defaultProps.onChange.mock.calls[defaultProps.onChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual(selected({ severity: ['critical', 'high', 'medium'] }));
  });

  it('navigates between chips with arrow keys', () => {
    render(<BlacklistFilterChips {...defaultProps} />);

    const walletChip = screen.getByTestId('chip-wallet');
    walletChip.focus();
    expect(walletChip).toHaveFocus();

    fireEvent.keyDown(walletChip, { key: 'ArrowRight' });
    expect(screen.getByTestId('chip-ip')).toHaveFocus();

    fireEvent.keyDown(screen.getByTestId('chip-ip'), { key: 'ArrowLeft' });
    expect(screen.getByTestId('chip-wallet')).toHaveFocus();

    fireEvent.keyDown(screen.getByTestId('chip-wallet'), { key: 'End' });
    expect(screen.getByTestId('chip-eu')).toHaveFocus();

    fireEvent.keyDown(screen.getByTestId('chip-eu'), { key: 'Home' });
    expect(screen.getByTestId('chip-wallet')).toHaveFocus();
  });

  it('toggles a chip with the Enter key', () => {
    render(<BlacklistFilterChips {...defaultProps} />);

    const criticalChip = screen.getByTestId('chip-critical');
    criticalChip.focus();
    fireEvent.keyDown(criticalChip, { key: 'Enter' });

    expect(defaultProps.onChange).toHaveBeenCalledWith(selected({ severity: ['critical'] }));
  });

  it('removes a focused chip with Delete/Backspace', () => {
    render(
      <BlacklistFilterChips
        {...defaultProps}
        selection={selected({ source: ['wallet', 'ip'] })}
      />
    );

    const walletChip = screen.getByTestId('chip-wallet');
    walletChip.focus();
    fireEvent.keyDown(walletChip, { key: 'Delete' });

    expect(defaultProps.onChange).toHaveBeenCalledWith(selected({ source: ['ip'] }));
  });

  it('renders disabled chips that cannot be toggled', () => {
    const options = [
      { id: 'legacy', label: 'Legacy Wallet', group: 'source', disabled: true },
      { id: 'wallet', label: 'Wallet', group: 'source' },
    ];
    render(<BlacklistFilterChips {...defaultProps} options={options} />);

    const legacyChip = screen.getByTestId('chip-legacy');
    expect(legacyChip).toBeDisabled();

    fireEvent.click(legacyChip);
    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it('collapses excess chips into an overflow menu and toggles from it', () => {
    render(<BlacklistFilterChips {...defaultProps} maxVisibleChips={4} />);

    expect(screen.queryByTestId('chip-medium')).not.toBeInTheDocument();
    expect(screen.getByText('+5 more')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('blacklist-chips-overflow-trigger'));
    expect(screen.getByTestId('blacklist-chips-overflow-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chip-medium'));
    expect(defaultProps.onChange).toHaveBeenCalledWith(selected({ severity: ['medium'] }));
  });

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <BlacklistFilterChips
        {...defaultProps}
        selection={selected({ severity: ['high'] })}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
