import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BlacklistSavedViews } from './BlacklistSavedViews';
import type { BlacklistSavedView } from './BlacklistSavedViews.types';
import type { BlacklistFilterSelection } from '../BlacklistFilterChips/BlacklistFilterChips.types';

expect.extend(toHaveNoViolations);

const EMPTY_SELECTION: BlacklistFilterSelection = {
  source: [],
  severity: [],
  region: [],
  createdDate: [],
};

const VIEWS: BlacklistSavedView[] = [
  {
    id: 'v1',
    name: 'Critical & High',
    isDefault: true,
    createdAt: '2026-07-01T00:00:00Z',
    filters: { ...EMPTY_SELECTION, severity: ['critical', 'high'] },
  },
  {
    id: 'v2',
    name: 'North America · 90d',
    createdAt: '2026-07-05T00:00:00Z',
    filters: { ...EMPTY_SELECTION, region: ['na'], createdDate: ['90d'] },
  },
];

describe('BlacklistSavedViews', () => {
  const handlers = {
    onApplyView: vi.fn(),
    onSaveView: vi.fn(),
    onRenameView: vi.fn(),
    onDeleteView: vi.fn(),
    onSetDefaultView: vi.fn(),
    onShareView: vi.fn(),
  };

  const defaultProps = {
    views: VIEWS,
    activeViewId: null,
    currentFilters: EMPTY_SELECTION,
    hasActiveFilters: false,
    hasError: false,
    ...handlers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the trigger with the saved views count', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    const trigger = screen.getByTestId('blacklist-saved-views-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Saved Views');
    expect(trigger).toHaveTextContent('2');
  });

  it('opens the panel and lists saved views with the default badge', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));

    expect(screen.getByTestId('blacklist-saved-views-panel')).toBeInTheDocument();
    expect(screen.getByText('Critical & High')).toBeInTheDocument();
    expect(screen.getByText('North America · 90d')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('applies a view when its name is clicked', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.click(screen.getByTestId('saved-view-apply-v2'));

    expect(handlers.onApplyView).toHaveBeenCalledWith(VIEWS[1]);
  });

  it('renames a view via the inline editor', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.click(screen.getByTestId('saved-view-rename-v1'));

    const renameInput = screen.getByTestId('saved-view-rename-input');
    expect(renameInput).toHaveValue('Critical & High');

    fireEvent.change(renameInput, { target: { value: 'Critical only' } });
    fireEvent.click(screen.getByTestId('saved-view-rename-confirm'));

    expect(handlers.onRenameView).toHaveBeenCalledWith('v1', 'Critical only');
  });

  it('cancels rename with Escape without reporting', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.click(screen.getByTestId('saved-view-rename-v1'));
    fireEvent.keyDown(screen.getByTestId('saved-view-rename-input'), { key: 'Escape' });

    expect(handlers.onRenameView).not.toHaveBeenCalled();
  });

  it('sets a view as the default', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.click(screen.getByTestId('saved-view-default-v2'));

    expect(handlers.onSetDefaultView).toHaveBeenCalledWith('v2');
  });

  it('deletes a view', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.click(screen.getByTestId('saved-view-delete-v2'));

    expect(handlers.onDeleteView).toHaveBeenCalledWith('v2');
  });

  it('shares a view and shows the copied confirmation', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.click(screen.getByTestId('saved-view-share-v1'));

    expect(handlers.onShareView).toHaveBeenCalledWith(VIEWS[0]);
    expect(screen.getByTestId('saved-view-copied-v1')).toHaveTextContent('Link copied!');
  });

  it('saves the current filters under a new name', () => {
    const activeFilters: BlacklistFilterSelection = {
      ...EMPTY_SELECTION,
      region: ['eu'],
    };
    render(
      <BlacklistSavedViews
        {...defaultProps}
        currentFilters={activeFilters}
        hasActiveFilters
      />
    );

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.change(screen.getByTestId('blacklist-saved-views-new-input'), {
      target: { value: 'EU entries' },
    });
    fireEvent.click(screen.getByTestId('blacklist-saved-views-save-btn'));

    expect(handlers.onSaveView).toHaveBeenCalledWith('EU entries', activeFilters);
  });

  it('disables the save button when there are no active filters', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    fireEvent.change(screen.getByTestId('blacklist-saved-views-new-input'), {
      target: { value: 'Anything' },
    });

    expect(screen.getByTestId('blacklist-saved-views-save-btn')).toBeDisabled();
  });

  it('renders the empty state when there are no saved views', () => {
    render(<BlacklistSavedViews {...defaultProps} views={[]} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    expect(screen.getByTestId('blacklist-saved-views-empty')).toBeInTheDocument();
    expect(screen.getByText('No saved views yet.')).toBeInTheDocument();
  });

  it('renders the error state when views failed to load', () => {
    render(<BlacklistSavedViews {...defaultProps} views={[]} hasError />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    expect(screen.getByTestId('blacklist-saved-views-error')).toBeInTheDocument();
    expect(screen.getByText(/couldn't load your saved views/i)).toBeInTheDocument();
  });

  it('closes the panel with Escape', () => {
    render(<BlacklistSavedViews {...defaultProps} />);

    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));
    expect(screen.getByTestId('blacklist-saved-views-panel')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('blacklist-saved-views-panel')).not.toBeInTheDocument();
  });

  it('has no axe accessibility violations', async () => {
    const { container } = render(<BlacklistSavedViews {...defaultProps} />);
    fireEvent.click(screen.getByTestId('blacklist-saved-views-trigger'));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
