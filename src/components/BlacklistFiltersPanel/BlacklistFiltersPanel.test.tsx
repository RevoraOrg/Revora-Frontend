import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BlacklistFiltersPanel } from './BlacklistFiltersPanel';
import {
  STORAGE_KEY_BLACKLIST_VIEWS,
  type BlacklistFiltersPanelProps,
} from './BlacklistFiltersPanel.types';

expect.extend(toHaveNoViolations);

const LocationProbe = () => {
  const [params] = useSearchParams();
  return <span data-testid="location-params">{params.toString()}</span>;
};

const renderPanel = (
  initialEntries = ['/distribution-dashboard'],
  props: Partial<BlacklistFiltersPanelProps> = {}
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <BlacklistFiltersPanel {...props} />
      <LocationProbe />
    </MemoryRouter>
  );
};

const entryCount = () =>
  within(screen.getByTestId('blacklist-entries')).getAllByRole('listitem').length;

describe('BlacklistFiltersPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the blacklist section with chips, saved views and entries', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Blacklist' })).toBeInTheDocument();
    expect(screen.getByTestId('blacklist-filter-chips')).toBeInTheDocument();
    expect(screen.getByTestId('blacklist-saved-views-trigger')).toBeInTheDocument();
    expect(entryCount()).toBe(10);
  });

  it('filters entries when a severity chip is selected', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('chip-critical'));

    expect(entryCount()).toBe(2);
    expect(screen.getByText('0x3f5C…9aB1')).toBeInTheDocument();
    expect(screen.getByText('phish-site.example.org')).toBeInTheDocument();
    expect(screen.queryByText('203.0.113.42')).not.toBeInTheDocument();
  });

  it('supports multi-select across groups', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('chip-critical'));
    fireEvent.click(screen.getByTestId('chip-na'));

    // Critical entries in North America: none -> empty state
    expect(screen.getByTestId('blacklist-empty')).toBeInTheDocument();
  });

  it('renders an empty state when nothing matches and allows resetting', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('chip-ip'));
    fireEvent.click(screen.getByTestId('chip-critical'));

    expect(screen.getByTestId('blacklist-empty')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('blacklist-reset-btn'));
    expect(screen.queryByTestId('blacklist-empty')).not.toBeInTheDocument();
    expect(entryCount()).toBe(10);
  });

  it('applies a saved view and reports it as the active view', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.click(screen.getByTestId('saved-view-apply-view-critical'));

    expect(entryCount()).toBe(4);
    expect(screen.getByText(/View: Critical & High/)).toBeInTheDocument();
  });

  it('saves a new view to localStorage when filters are active', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('chip-wallet'));
    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.change(screen.getByTestId('blacklist-saved-views-new-input'), {
      target: { value: 'Wallet only' },
    });
    fireEvent.click(screen.getByTestId('blacklist-saved-views-save-btn'));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_BLACKLIST_VIEWS) || '[]');
    expect(stored.some((view: { name: string }) => view.name === 'Wallet only')).toBe(true);
    expect(screen.getByTestId('blacklist-saved-views-trigger')).toHaveTextContent('3');
  });

  it('seeds filters and saved-view state from URL params', () => {
    renderPanel(['/distribution-dashboard?blSeverity=critical']);

    expect(screen.getByTestId('chip-critical')).toHaveAttribute('aria-pressed', 'true');
    expect(entryCount()).toBe(2);
  });

  it('writes the active selection to URL params', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('chip-wallet'));

    expect(screen.getByTestId('location-params')).toHaveTextContent('blSource=wallet');
  });

  it('shares a saved view by copying a URL with encoded filters', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderPanel();

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.click(screen.getByTestId('saved-view-share-view-critical'));

    expect(writeText).toHaveBeenCalledTimes(1);
    const url = writeText.mock.calls[0][0] as string;
    expect(url).toContain('blSeverity=critical');
    expect(url).toContain('blView=view-critical');
    expect(screen.getByTestId('saved-view-copied-view-critical')).toHaveTextContent('Link copied!');
  });

  it('renders the saved-views error state when loading fails', () => {
    renderPanel(['/distribution-dashboard'], { simulateLoadError: true });

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    expect(screen.getByTestId('blacklist-saved-views-error')).toBeInTheDocument();
  });

  it('renders the saved-views empty state when there are no views', () => {
    renderPanel(['/distribution-dashboard'], { defaultViews: [] });

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    expect(screen.getByTestId('blacklist-saved-views-empty')).toBeInTheDocument();
  });

  it('has no axe accessibility violations', async () => {
    const { container } = renderPanel();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  }, 60000);
});
